import { requireLocal } from "./transport.mjs";
import { validateTerrainFiles } from "./terrain-validation.mjs";
export class Terrain {
  constructor(api, store, { uploadRoots = [] } = {}) {
    this.api = api;
    this.store = store;
    this.uploadRoots = uploadRoots;
    this.busy = new Set();
  }
  local() {
    requireLocal(this.api.config);
  }
  path(plan, suffix = "") {
    return `/api/admin/terrain-bundles/${plan.region}/L${plan.lod}${suffix}`;
  }
  async validate({ manifestPath }) {
    this.local();
    try {
      const plan = validateTerrainFiles(manifestPath, this.uploadRoots);
      const receipt = this.store.add({
        scope: "terrain",
        plan,
        approved: false,
        createdAt: Date.now(),
      });
      return {
        valid: true,
        validationId: receipt.id,
        bundleId: plan.bundleId,
        region: plan.region,
        lod: `L${plan.lod}`,
        tileCount: plan.tileCount,
        totalBytes: plan.totalBytes,
        manifestSize: plan.manifestSize,
        manifestSha256: plan.manifestSha256,
        sourceManifestSha256: plan.sourceManifestSha256,
        manifestKey: plan.manifestKey,
        metadataKey: plan.prefix + "_bundle.json",
        files: plan.files,
        confirmation: `UPLOAD TERRAIN ${receipt.id} ${plan.bundleId}`,
        needsUserApproval: true,
        uploads: 0,
        warning:
          "Remote manifest filenames are rewritten to x_y.glb. Metadata stays staging until all objects reconcile. Existing different bundles cannot be overwritten.",
      };
    } catch (error) {
      return { valid: false, errors: [error.message], uploads: 0 };
    }
  }
  receipt(id) {
    const c = this.store.get(id);
    if (c.scope !== "terrain") throw new Error("Not a terrain validation receipt");
    return c;
  }
  verifyPlan(receipt, capture = false) {
    const now = validateTerrainFiles(receipt.plan.manifestPath, this.uploadRoots, { capture });
    if (
      now.bundleId !== receipt.plan.bundleId ||
      now.sourceManifestSha256 !== receipt.plan.sourceManifestSha256
    )
      throw new Error("Bundle changed since validation: validate and review a new plan");
    return now;
  }
  async inventory(plan) {
    return this.api.terrainRequest(this.path(plan));
  }
  checkInventory(plan, status) {
    if (status.state === "conflict" || status.unexpected?.length)
      throw new Error("Remote terrain conflict; no overwrite allowed");
    if (status.bundleId && status.bundleId !== plan.bundleId)
      throw new Error("Destination belongs to a different bundle");
    const expected = new Map([
      [
        plan.manifestKey,
        { size: plan.manifestSize, sha256: plan.manifestSha256, mimeType: "application/json" },
      ],
      ...plan.files.map((f) => [f.r2Key, f]),
    ]);
    if (status.bundleId) {
      if (
        status.objects?.length !== expected.size ||
        new Set(status.objects.map((o) => o.key)).size !== expected.size
      )
        throw new Error("Remote object count mismatch");
      for (const row of status.objects) {
        const e = expected.get(row.key);
        if (
          !e ||
          row.size !== e.size ||
          row.sha256 !== e.sha256 ||
          row.mimeType !== e.mimeType ||
          !["missing", "verified"].includes(row.status)
        )
          throw new Error("Remote object metadata/hash mismatch");
        if (row.status === "verified" && row.actualHash !== e.sha256)
          throw new Error("Remote SHA-256 readback mismatch");
      }
    }
  }
  async reconcile({ validationId }) {
    this.local();
    const c = this.receipt(validationId);
    const status = await this.inventory(c.plan);
    this.checkInventory(c.plan, status);
    // Read-only: completion is registered only by the approved upload/resume flow.
    return {
      validationId,
      bundleId: c.plan.bundleId,
      ...status,
      manifestUrl: this.api.config.origin + "/" + c.plan.manifestKey,
      resumeRequired: !status.complete,
      approved: !!c.approved,
    };
  }
  async upload({ validationId, confirmation }) {
    this.local();
    const c = this.receipt(validationId);
    if (confirmation !== `UPLOAD TERRAIN ${c.id} ${c.plan.bundleId}`)
      throw new Error(
        "Show the validation upload plan and obtain explicit user confirmation first",
      );
    if (c.approved)
      throw new Error(
        "Already approved/started: use reconcile_terrain_bundle then resume_terrain_bundle",
      );
    if (Date.now() - c.createdAt > 24 * 60 * 60 * 1000)
      throw new Error("Validation plan expired; validate again");
    return this.transfer(c, false);
  }
  async resume({ validationId }) {
    this.local();
    const c = this.receipt(validationId);
    if (!c.approved) throw new Error("No previously approved upload to resume");
    return this.transfer(c, true);
  }
  async transfer(c, resume) {
    if (this.busy.has(c.id)) throw new Error("Terrain upload already running");
    this.busy.add(c.id);
    let lease;
    try {
      // ALL files are revalidated and captured BEFORE the first network write.
      const plan = this.verifyPlan(c, true);
      const before = await this.inventory(plan);
      this.checkInventory(plan, before);
      // Separate lease preserves immutable validation receipt and rejects concurrent processes.
      lease = this.store.claimTerrain(c.id);
      c = { ...c, approved: true, startedAt: Date.now() };
      this.store.set(c.id, "uploading", c);
      this.store.event(resume ? "terrain_resume" : "terrain_upload_approved", {
        validationId: c.id,
        bundleId: plan.bundleId,
      });
      if (before.complete) return this.finish(c, before);
      let status = before;
      const manifestRow = status.objects?.find((o) => o.key === plan.manifestKey);
      if (!manifestRow || manifestRow.status === "missing")
        status = await this.api.terrainRequest(this.path(plan), {
          method: "POST",
          body: plan.manifestBytes,
          mimeType: "application/json",
        });
      this.checkInventory(plan, status);
      for (const f of plan.files) {
        const present = status.objects.find((o) => o.key === f.r2Key);
        if (present?.status === "verified") continue;
        const result = await this.api.terrainRequest(this.path(plan, `/tiles/${f.x}_${f.y}`), {
          method: "PUT",
          body: plan.payloads.get(`${f.x}_${f.y}`),
          mimeType: "model/gltf-binary",
          bundleId: plan.bundleId,
        });
        if (
          result.status !== "verified" ||
          result.key !== f.r2Key ||
          result.actualHash !== f.sha256 ||
          result.size !== f.size ||
          result.mimeType !== f.mimeType
        )
          throw new Error("Tile readback mismatch: " + f.tileId);
        this.store.heartbeatTerrain(c.id, lease);
        this.store.event("terrain_tile_verified", {
          validationId: c.id,
          key: f.r2Key,
          sha256: f.sha256,
        });
      }
      const reconciled = await this.api.terrainRequest(this.path(plan, "/reconcile"), {
        method: "POST",
        bundleId: plan.bundleId,
      });
      this.checkInventory(plan, reconciled);
      if (!reconciled.complete) throw new Error("Bundle is not complete after reconcile");
      const final = await this.inventory(plan);
      this.checkInventory(plan, final);
      if (!final.complete) throw new Error("Final bundle readback incomplete");
      return this.finish(c, final);
    } catch (error) {
      if (c.approved) {
        this.store.set(c.id, "interrupted", { ...c, error: error.message });
        this.store.event("terrain_interrupted", { validationId: c.id, error: error.message });
      }
      throw new Error(
        `${error.message}; validationId=${c.id}. Reconcile before resume; no blind upload retry.`,
      );
    } finally {
      if (lease) this.store.releaseTerrain(c.id, lease);
      this.busy.delete(c.id);
    }
  }
  finish(c, status) {
    const result = {
      validationId: c.id,
      bundleId: c.plan.bundleId,
      complete: true,
      manifestUrl: this.api.config.origin + "/" + c.plan.manifestKey,
      tileCount: c.plan.tileCount,
      totalBytes: c.plan.totalBytes,
      objects: status.objects,
    };
    this.store.set(c.id, "complete", { ...c, result });
    this.store.event("terrain_complete", { validationId: c.id, bundleId: c.plan.bundleId });
    return result;
  }
}
