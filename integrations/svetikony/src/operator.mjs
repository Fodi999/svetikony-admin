import { readFileSync, realpathSync, statSync } from "node:fs";
import { extname, basename, sep } from "node:path";
import {
  CATALOG,
  entityNames,
  spec,
  entityPath,
  contentView,
  normalizePatch,
  writableSnapshot,
  civilDate,
} from "./catalog.mjs";
import { hash } from "./store.mjs";
import { audit, relations, coverage } from "./audit.mjs";
export class Operator {
  constructor(api, store, { uploadRoots = [] } = {}) {
    this.api = api;
    this.store = store;
    this.uploadRoots = uploadRoots;
  }
  async list(entity) {
    const rows = await this.api.request(entityPath(entity));
    if (!Array.isArray(rows)) throw new Error("Expected full list from administrative API");
    return rows.map((r) => contentView(entity, r));
  }
  async get(entity, id) {
    const row = await this.api.request(entityPath(entity, id));
    if (!row || row.id !== id) throw new Error("Unexpected entity response");
    return contentView(entity, row);
  }
  async snapshot() {
    const data = {};
    const errors = [];
    for (const entity of entityNames) {
      try {
        data[entity] = await this.list(entity);
      } catch (e) {
        errors.push({ entity, message: e.message });
      }
    }
    return { data, errors, complete: errors.length === 0 };
  }
  async inventory() {
    const s = await this.snapshot();
    return {
      complete: s.complete,
      errors: s.errors,
      entities: Object.fromEntries(
        Object.entries(s.data).map(([e, rows]) => [
          e,
          {
            total: rows.length,
            published: rows.filter((r) => r.status === "published").length,
            drafts: rows.filter((r) => r.status === "draft").length,
          },
        ]),
      ),
    };
  }
  async audit() {
    const s = await this.snapshot();
    return { ...audit(s.data), complete: s.complete, errors: s.errors };
  }
  async graph(entity, id) {
    const s = await this.snapshot();
    const graph = relations(s.data);
    return {
      ...graph,
      edges: graph.edges.filter(
        (e) =>
          (e.from.entity === entity && e.from.id === id) ||
          (e.to.entity === entity && e.to.id === id),
      ),
      complete: s.complete,
      errors: s.errors,
    };
  }
  async coverage(year, language, month) {
    const s = await this.snapshot();
    const c = coverage(s.data, year, language);
    return {
      ...c,
      days: month ? c.days.filter((d) => Number(d.date.slice(5, 7)) === month) : c.days,
      complete: s.complete,
      errors: s.errors,
    };
  }
  async validate(entity, patch, before, publishing = false) {
    const s = spec(entity);
    const after = { ...before, ...patch };
    for (const field of s.required)
      if (!after[field]?.trim?.()) throw new Error("Required field: " + field);
    if (before?.status === "published" && patch.slug !== undefined && patch.slug !== before.slug)
      throw new Error("Changing a published URL requires a redirect workflow outside this plugin");
    if (before?.language && patch.language && before.language !== patch.language)
      throw new Error("Create a separate translation; do not change the identity language");
    const rows = await this.list(entity);
    if (
      rows.some(
        (r) => r.id !== before?.id && r.slug === after.slug && r.language === after.language,
      )
    )
      throw new Error("Duplicate slug/language; reuse the existing entity");
    for (const [field, target] of Object.entries(s.refs)) {
      if (!after[field]) continue;
      const linked = await this.get(target, after[field]);
      if (linked.language !== after.language)
        throw new Error("Relation language mismatch: " + field);
      if (publishing && linked.status !== "published")
        throw new Error("Publish referenced content first: " + field);
    }
    return after;
  }
  async getChange(id) {
    if (this.api.config?.environment !== "production") return this.store.get(id);
    // Interrupted Visualizer/Terrain receipts remain local even with delegated auth.
    let receipt;
    try {
      receipt = this.store.get(id);
    } catch {
      /* Not a local operation. */
    }
    if (["visualizer", "visualizer-base", "terrain"].includes(receipt?.scope)) return receipt;
    return this.api.proposalRequest(id);
  }
  async listChanges() {
    return this.api.config?.environment === "production"
      ? this.api.proposalRequest()
      : this.store.list();
  }
  async prepare(entity, id, patch, reason, sources = []) {
    if (!reason?.trim()) throw new Error("Explain the purpose of the change");
    const normalized = Object.keys(patch).length ? normalizePatch(entity, patch) : {};
    const before = id ? await this.get(entity, id) : null;
    await this.validate(entity, normalized, before);
    if (this.api.config?.environment === "production") {
      if (!id) throw new Error("Server proposals require an existing target; create a draft first");
      return this.api.proposalRequest("", {
        method: "POST",
        body: { targetType: entity, targetId: id, patch: normalized, reason, sources },
      });
    }
    const change = this.store.add({
      entity,
      entityId: id ?? null,
      before,
      beforeHash: hash(before),
      patch: normalized,
      reason,
      sources,
      createdAt: new Date().toISOString(),
    });
    this.store.event("change_proposed", {
      changeId: change.id,
      entity,
      entityId: id ?? null,
      fields: Object.keys(normalized),
    });
    return change;
  }
  async apply(id, { publish = false, confirmation } = {}) {
    if (this.api.config?.environment === "production")
      throw new Error("Server proposals require human review in web-admin");
    const c = this.store.get(id);
    if (publish && confirmation !== `PUBLISH ${id}`)
      throw new Error("Explicit publication confirmation must identify this change");
    if (!publish && c.before?.status === "published")
      throw new Error(
        "Published content remains unchanged. Use a separately authorized publish_change",
      );
    if (c.status !== "proposed")
      throw new Error("Change already processed or uncertain; inspect/reconcile it");
    this.store.claim(id);
    let writeStarted = false;
    try {
      const current = c.entityId ? await this.get(c.entity, c.entityId) : null;
      if (hash(current) !== c.beforeHash)
        throw new Error("Source changed since proposal; prepare a fresh change");
      await this.validate(c.entity, c.patch, current, publish);
      if (
        publish &&
        c.sources.length === 0 &&
        ["calendar", "saints", "prayers", "gospel", "articles"].includes(c.entity)
      )
        throw new Error("Attach the reviewed source references before publication");
      // Draft content is consumed by the existing autonomous Telegram path.
      // Reject calendar-linked draft writes until that path is explicitly disabled.
      if (
        !publish &&
        (c.entity === "calendar" || current?.calendarDayId || c.patch.calendarDayId)
      ) {
        const settings = await this.api.request("/api/admin/telegram/autopost/settings");
        if (settings.globalEnabled !== false)
          throw new Error(
            "Calendar draft writes are locked while autonomous Telegram publication is enabled. The proposal remains local; turn off autopost in the admin before applying it.",
          );
      }
      const payload = { ...c.patch, status: publish ? "published" : "draft" };
      c.expected = payload;
      this.store.set(id, "applying", c);
      this.store.event("write_started", {
        changeId: id,
        entity: c.entity,
        entityId: c.entityId,
        publish,
      });
      writeStarted = true;
      const result = await this.api.request(entityPath(c.entity, c.entityId), {
        method: c.entityId ? "PUT" : "POST",
        body: payload,
      });
      if (!result?.id) throw new Error("Missing saved entity ID");
      // Persist ID immediately so a failed readback can be reconciled without creating a duplicate.
      c.savedId = result.id;
      c.expected = payload;
      this.store.set(id, "applying", c);
      const after = await this.get(c.entity, result.id);
      for (const [field, value] of Object.entries(payload))
        if (hash(after[field]) !== hash(value)) throw new Error("Readback mismatch: " + field);
      this.store.set(id, "applied", { ...c, after, afterHash: hash(after) });
      this.store.event("write_verified", { changeId: id, entityId: result.id, published: publish });
      return {
        changeId: id,
        status: "applied",
        entityId: result.id,
        published: publish,
        verified: true,
        concurrency:
          "Plugin operations serialized; external CMS writes are checked before/after but API has no atomic version guard.",
      };
    } catch (e) {
      this.store.set(id, writeStarted ? "uncertain" : "proposed", { ...c, lastError: e.message });
      this.store.event(writeStarted ? "write_uncertain" : "write_blocked", {
        changeId: id,
        reason: e.message,
      });
      throw e;
    } finally {
      if (!["uncertain", "applying"].includes(this.store.get(id).status)) this.store.release(id);
    }
  }
  async reconcile(id) {
    const c = this.store.get(id);
    if (!["uncertain", "applying"].includes(c.status)) return c;
    let found;
    if (c.savedId || c.entityId) found = await this.get(c.entity, c.savedId || c.entityId);
    else {
      const matches = (await this.list(c.entity)).filter(
        (r) => r.slug === c.patch.slug && r.language === c.patch.language,
      );
      if (matches.length === 1) found = matches[0];
    }
    const expected = c.expected;
    if (
      expected &&
      found &&
      Object.entries(expected).every(([k, v]) => hash(found[k]) === hash(v))
    ) {
      this.store.set(id, "applied", {
        ...c,
        after: found,
        afterHash: hash(found),
        savedId: found.id,
      });
      this.store.release(id);
      return { status: "applied", verified: true, entityId: found.id };
    }
    return {
      status: c.status,
      requiresReview: true,
      current: found ?? null,
      expected: expected ?? c.patch,
      note: "Do not retry automatically. Inspect the record and prepare a new change only after resolving the outcome.",
    };
  }
  async restoreProposal(id) {
    const c = this.store.get(id);
    if (c.status !== "applied" || !c.before)
      throw new Error(
        "Only updates with a verified previous version can be restored; new entities are never auto-deleted",
      );
    const current = await this.get(c.entity, c.savedId);
    if (hash(current) !== c.afterHash) throw new Error("Record changed after this operation");
    const patch = writableSnapshot(c.entity, c.before);
    return this.prepare(
      c.entity,
      c.savedId,
      patch,
      `Restore content before change ${id}`,
      c.sources,
    );
  }
  async imageBrief(date, language) {
    civilDate(date);
    const s = await this.snapshot();
    if (!s.complete)
      throw new Error("Cannot prepare factual image context from incomplete API data");
    const days = s.data.calendar.filter((d) => d.dateNewStyle === date && d.language === language);
    if (!days.length) throw new Error("No calendar day exists for this date/language");
    const ids = new Set(days.map((d) => d.id));
    return {
      days,
      saints: s.data.saints.filter((r) => ids.has(r.calendarDayId)),
      icons: s.data.icons.filter((r) => ids.has(r.calendarDayId)),
      instruction:
        "Verify identity and source first. Use native Codex image generation when available, then upload_image and prepare_change. AI illustration is not a certified canonical icon. This tool does not generate or publish images.",
    };
  }
  async uploadImage(path, entity, id, origin) {
    const modules = {
      calendar: ["calendar", "main"],
      saints: ["saints", "main"],
      icons: ["icons", "main"],
      prayers: ["prayers", "image"],
      alphabet: ["alphabet", "main"],
    };
    if (!Object.hasOwn(modules, entity)) throw new Error("No image field for this entity");
    const row = await this.get(entity, id);
    const real = realpathSync(path);
    if (
      !this.uploadRoots.some((root) => {
        try {
          const r = realpathSync(root);
          return real.startsWith(r + sep);
        } catch {
          return false;
        }
      })
    )
      throw new Error("Image must be in configured upload roots");
    const stat = statSync(real);
    if (!stat.isFile() || stat.size < 12 || stat.size > 10 * 1024 * 1024)
      throw new Error("Image size must be under 10 MiB");
    const bytes = readFileSync(real);
    const ext = extname(real).toLowerCase();
    let mime;
    if (
      ext === ".png" &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      mime = "image/png";
    if ([".jpg", ".jpeg"].includes(ext) && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
      mime = "image/jpeg";
    if (
      ext === ".webp" &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    )
      mime = "image/webp";
    if (!mime) throw new Error("Only PNG, JPEG and WebP image files are allowed");
    const form = new FormData();
    form.set("file", new Blob([bytes], { type: mime }), basename(real));
    form.set("module", modules[entity][0]);
    form.set("entityId", id);
    form.set("purpose", modules[entity][1]);
    const asset = await this.api.request("/api/admin/media/upload", { method: "POST", body: form });
    if (!asset?.key)
      throw new Error("Upload response missing key; inspect media library before retry");
    this.store.event("image_uploaded", { entity, entityId: id, key: asset.key, origin });
    const patch = { [CATALOG[entity].image]: asset.key };
    if (entity === "calendar")
      patch.imageMetadata =
        origin === "ai_generated" ? { origin: "ai_generated", identityVerified: false } : null;
    const proposal = await this.prepare(
      entity,
      id,
      patch,
      "Attach uploaded " + origin + " image; publication is a separate action",
      [],
    );
    return {
      asset,
      changeId: proposal.id,
      attached: false,
      published: false,
      existingStatus: row.status,
    };
  }
}
