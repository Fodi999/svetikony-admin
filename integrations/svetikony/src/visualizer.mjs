import { z } from "zod";
import { hash } from "./store.mjs";
import { requireLocal } from "./transport.mjs";
import { visualId, eventCreate, eventPatch, validateChronology } from "./visualizer-schema.mjs";
import { readGlb, MODEL_KEY, GLB_MIME } from "./visualizer-glb.mjs";
const EVENTS = "/api/admin/church-content/visualizer-events";
const MODELS = "/api/admin/church-content/visualizer-models";
const uuid = z.string().uuid();
const same = (a, b) => hash(a) === hash(b);
function matchFields(row, expected) {
  for (const [key, value] of Object.entries(expected))
    if (!same(row[key], value)) throw new Error("Readback mismatch: " + key);
}
export class Visualizer {
  constructor(api, store, { uploadRoots = [] } = {}) {
    this.api = api;
    this.store = store;
    this.uploadRoots = uploadRoots;
  }
  local() {
    requireLocal(this.api.config);
  }
  async rows(path) {
    this.local();
    const rows = await this.api.request(path);
    if (!Array.isArray(rows)) throw new Error("Expected complete Visualizer list");
    for (const row of rows) visualId.parse(row.id);
    return rows;
  }
  async events() {
    return this.rows(EVENTS);
  }
  async models() {
    return this.rows(MODELS);
  }
  async row(path, id) {
    this.local();
    visualId.parse(id);
    const row = await this.api.request(path + "/" + id);
    if (!row || row.id !== id) throw new Error("Unexpected Visualizer identity");
    return row;
  }
  async event(id) {
    return this.row(EVENTS, id);
  }
  async model(id) {
    return this.row(MODELS, id);
  }
  async group(groupId, drafts = false) {
    visualId.parse(groupId);
    const rows = (await this.events()).filter((r) => r.translationGroupId === groupId);
    if (
      !rows.length ||
      new Set(rows.map((r) => r.language)).size !== rows.length ||
      new Set(rows.map((r) => r.slug)).size !== 1 ||
      rows.some((r) => !["uk", "ru", "en"].includes(r.language))
    )
      throw new Error("Invalid or ambiguous translation group");
    if (drafts && rows.some((r) => r.status !== "draft"))
      throw new Error("Model attachment requires ALL translations to be drafts");
    return rows;
  }
  async detail(id) {
    const event = await this.event(id);
    return {
      event,
      translations: await this.group(event.translationGroupId),
      models: (await this.models()).filter((m) => m.eventGroupId === event.translationGroupId),
      preview: {
        publicUrl: this.api.config.origin + "/" + event.language + "/pravoslavna-istoriya",
        draftVisiblePublicly: false,
        note: "Public list includes published events only; inspect drafts in authenticated admin preview",
      },
    };
  }
  async base() {
    const bases = (await this.models()).filter((m) => m.isBaseEarth);
    if (bases.length > 1) throw new Error("Multiple Base Earth records");
    const publicBase = await this.api.publicJson("/api/church/visualizer-models/base-earth");
    const model = bases[0] ?? null;
    if (
      (publicBase?.id ?? null) !== (model?.id ?? null) ||
      (model && publicBase.r2Key !== model.r2Key)
    )
      throw new Error("Public/admin Base Earth mismatch");
    return { model, media: model ? await this.checkModel(model) : null };
  }
  async checkModel(model, digest = false) {
    const media = await this.api.modelMedia(model.r2Key, digest);
    if (model.mimeType !== GLB_MIME || model.fileSize !== media.size)
      throw new Error("Model/R2 metadata mismatch");
    return media;
  }
  async calendarRef(event) {
    if (!event.calendarDayId) return;
    const day = await this.api.request(
      "/api/admin/church-content/calendar-days/" + visualId.parse(event.calendarDayId),
    );
    if (day?.id !== event.calendarDayId || day.language !== event.language)
      throw new Error("Calendar relationship/language mismatch");
  }
  // requestId is caller-generated once per logical operation; retain it across retries.
  async run(requestId, kind, input, work) {
    this.local();
    uuid.parse(requestId);
    const fingerprint = hash({ kind, input });
    const prior = this.store.findVisualizerRequest(requestId);
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new Error("requestId already used for different input");
      if (prior.status === "applied")
        return { operationId: prior.id, verified: true, replayed: true, result: prior.result };
      throw new Error(
        `Operation ${prior.id} is ${prior.status}; use reconcile_visualizer_operation, never retry a write`,
      );
    }
    let operation = this.store.add({
      scope: "visualizer",
      requestId,
      kind,
      input,
      fingerprint,
      startedAt: Date.now(),
    });
    this.store.claim(operation.id);
    let dispatched = false;
    const context = {
      checkpoint: (patch) => {
        operation = { ...operation, ...patch };
        this.store.set(operation.id, "applying", operation);
      },
      write: async (path, options) => {
        dispatched = true;
        return this.api.request(path, options);
      },
    };
    try {
      const result = await work(context);
      operation = { ...operation, result };
      this.store.set(operation.id, "applied", operation);
      this.store.release(operation.id);
      this.store.event("visualizer_verified", { operationId: operation.id, kind });
      return { operationId: operation.id, verified: true, result };
    } catch (e) {
      const status = dispatched ? "uncertain" : "failed";
      this.store.set(operation.id, status, { ...operation, error: e.message });
      if (!dispatched) this.store.release(operation.id);
      this.store.event("visualizer_" + status, {
        operationId: operation.id,
        kind,
        error: e.message,
      });
      throw new Error(
        `${e.message}; operationId=${operation.id}; ${status}. No automatic write replay.`,
      );
    }
  }
  async verifyEvent(id, expected, expectedGroup) {
    const row = await this.event(id);
    matchFields(row, expected);
    if (row.status !== "draft" || row.publishedAt)
      throw new Error("Event must remain unpublished draft");
    visualId.parse(row.translationGroupId);
    if (expectedGroup && row.translationGroupId !== expectedGroup)
      throw new Error("Translation group mismatch");
    const siblings = await this.group(row.translationGroupId);
    const sameSlug = (await this.events()).filter((r) => r.slug === row.slug);
    if (sameSlug.some((r) => r.translationGroupId !== row.translationGroupId))
      throw new Error("Slug split across translation groups");
    await this.calendarRef(row);
    const models = (await this.models()).filter((m) => m.eventGroupId === row.translationGroupId);
    for (const model of models) await this.checkModel(model);
    return { event: row, translations: siblings, models };
  }
  async create({ requestId, event, translationOf }) {
    this.local();
    event = eventCreate.parse(event);
    validateChronology(event);
    return this.run(
      requestId,
      "create_event",
      { event, translationOf: translationOf ?? null },
      async (ctx) => {
        const sameSlug = (await this.events()).filter((r) => r.slug === event.slug);
        if (sameSlug.some((r) => r.language === event.language))
          throw new Error("Language already exists; do not duplicate");
        let groupId = null;
        if (translationOf) {
          const source = await this.event(translationOf);
          if (source.slug !== event.slug || source.language === event.language)
            throw new Error("Translations require same slug and a different language");
          await this.group(source.translationGroupId);
          groupId = source.translationGroupId;
          if (sameSlug.some((r) => r.translationGroupId !== groupId))
            throw new Error("Ambiguous translation slug");
        } else if (sameSlug.length)
          throw new Error("Existing slug: explicitly provide translationOf");
        await this.calendarRef(event);
        const expected = { ...event, status: "draft" };
        ctx.checkpoint({ expected, expectedGroup: groupId });
        const saved = await ctx.write(EVENTS, { method: "POST", body: expected });
        ctx.checkpoint({ savedId: visualId.parse(saved?.id) });
        return this.verifyEvent(saved.id, expected, groupId);
      },
    );
  }
  async update({ requestId, id, patch }) {
    this.local();
    visualId.parse(id);
    patch = eventPatch.parse(patch);
    if (!Object.keys(patch).length) throw new Error("Empty event patch");
    return this.run(requestId, "update_event", { id, patch }, async (ctx) => {
      const before = await this.event(id);
      if (before.status !== "draft" || before.publishedAt)
        throw new Error("Only unpublished drafts may be updated");
      for (const field of ["slug", "language"])
        if (patch[field] !== undefined && patch[field] !== before[field])
          throw new Error("Do not change translation identity: " + field);
      validateChronology({ ...before, ...patch });
      await this.calendarRef({ ...before, ...patch });
      const expected = { ...patch, status: "draft", slug: before.slug, language: before.language };
      ctx.checkpoint({ before, expected, expectedGroup: before.translationGroupId, savedId: id });
      if (!same(before, await this.event(id))) throw new Error("Event changed during preparation");
      await ctx.write(EVENTS + "/" + id, { method: "PUT", body: { ...patch, status: "draft" } });
      return this.verifyEvent(id, expected, before.translationGroupId);
    });
  }
  async upload({ requestId, path, title = "", mimeType = GLB_MIME }) {
    this.local();
    uuid.parse(requestId);
    z.string().max(200).parse(title);
    const file = readGlb(path, this.uploadRoots, mimeType);
    const input = { filename: file.filename, sha256: file.sha256, size: file.size, title };
    return this.run(requestId, "upload_glb", input, async (ctx) => {
      const form = new FormData();
      form.set("module", "visualizer");
      form.set("purpose", "model");
      form.set("entityId", requestId);
      form.set("file", new Blob([file.bytes], { type: GLB_MIME }), file.filename);
      ctx.checkpoint({ expectedFile: input });
      const uploaded = await ctx.write("/api/admin/media/upload", { method: "POST", body: form });
      // Persist returned key before further calls: a failed metadata step never reuploads bytes.
      ctx.checkpoint({ uploaded });
      if (
        !MODEL_KEY.test(uploaded?.key ?? "") ||
        !uploaded.key.startsWith("media/visualizer/" + requestId + "/model/") ||
        uploaded.kind !== "model" ||
        uploaded.contentType !== GLB_MIME ||
        uploaded.size !== file.size
      )
        throw new Error("Invalid R2 upload mapping");
      const media = await this.api.modelMedia(uploaded.key, true);
      if (media.sha256 !== file.sha256 || media.size !== file.size)
        throw new Error("Uploaded GLB readback checksum mismatch");
      const expected = {
        eventGroupId: null,
        title,
        r2Key: uploaded.key,
        filename: file.filename,
        mimeType: GLB_MIME,
        fileSize: file.size,
      };
      ctx.checkpoint({ expected, media });
      const saved = await ctx.write(MODELS, { method: "POST", body: expected });
      ctx.checkpoint({ savedId: visualId.parse(saved?.id) });
      return this.verifyUpload(saved.id, expected, file.sha256);
    });
  }
  async verifyUpload(id, expected, sha256) {
    const model = await this.model(id);
    matchFields(model, expected);
    if (model.isBaseEarth) throw new Error("Upload must not replace Base Earth");
    const media = await this.checkModel(model, true);
    if (media.sha256 !== sha256) throw new Error("R2 content checksum mismatch");
    return {
      model,
      r2Key: model.r2Key,
      url: media.url,
      filename: model.filename,
      size: model.fileSize,
      mimeType: model.mimeType,
      etag: media.etag,
      sha256,
      attachment: "standalone; use attach_model_to_visualizer_event",
    };
  }
  async attach({ requestId, modelId, eventId }) {
    this.local();
    visualId.parse(modelId);
    visualId.parse(eventId);
    return this.run(requestId, "attach_model", { modelId, eventId }, async (ctx) => {
      const event = await this.event(eventId);
      const siblings = await this.group(event.translationGroupId, true);
      const before = await this.model(modelId);
      if (
        before.isBaseEarth ||
        (before.eventGroupId && before.eventGroupId !== event.translationGroupId)
      )
        throw new Error("Cannot move Base Earth or a model owned by another group");
      await this.checkModel(before);
      ctx.checkpoint({
        before,
        savedId: modelId,
        expectedGroup: event.translationGroupId,
        eventId,
        expected: { ...before, eventGroupId: event.translationGroupId },
      });
      if (
        !same(before, await this.model(modelId)) ||
        !same(siblings, await this.group(event.translationGroupId, true))
      )
        throw new Error("Model/event group changed during preparation");
      if (before.eventGroupId !== event.translationGroupId)
        await ctx.write(MODELS + "/" + modelId, {
          method: "PUT",
          body: { eventGroupId: event.translationGroupId },
        });
      return this.verifyAttachment(modelId, event.translationGroupId, before);
    });
  }
  async verifyAttachment(modelId, groupId, before) {
    const model = await this.model(modelId);
    if (model.eventGroupId !== groupId || model.isBaseEarth)
      throw new Error("Model relationship mismatch");
    matchFields(model, {
      r2Key: before.r2Key,
      fileSize: before.fileSize,
      mimeType: before.mimeType,
      filename: before.filename,
    });
    const translations = await this.group(groupId, true);
    const models = (await this.models()).filter((m) => m.eventGroupId === groupId);
    if (!models.some((m) => m.id === modelId)) throw new Error("Model missing from group readback");
    return { model, translations, media: await this.checkModel(model) };
  }
  async prepareBase({ modelId }) {
    this.local();
    const current = await this.base();
    const candidate = await this.model(modelId);
    if (candidate.isBaseEarth) throw new Error("Model is already Base Earth");
    const media = await this.checkModel(candidate);
    const proposal = this.store.add({
      scope: "visualizer-base",
      kind: "set_base",
      current: current.model,
      candidate,
      media,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    return {
      proposalId: proposal.id,
      CURRENT_BASE_EARTH: current.model,
      NEW_MODEL: candidate,
      FILE_SIZE: media.size,
      R2_KEY: candidate.r2Key,
      AFFECTED_VISUALIZER: this.api.config.origin + "/{uk|ru|en}/pravoslavna-istoriya",
      confirmation: "SET BASE EARTH " + proposal.id,
      expiresAt: proposal.expiresAt,
      needsExplicitUserApproval: true,
      oldModelWillBeDeleted: false,
    };
  }
  async setBase({ proposalId, confirmation }) {
    this.local();
    uuid.parse(proposalId);
    const proposal = this.store.get(proposalId);
    if (
      proposal.scope !== "visualizer-base" ||
      proposal.kind !== "set_base" ||
      proposal.status !== "proposed" ||
      Date.now() > proposal.expiresAt ||
      confirmation !== "SET BASE EARTH " + proposalId
    )
      throw new Error(
        "A fresh reviewed Base Earth proposal and explicit confirmation are required",
      );
    this.store.claim(proposalId);
    proposal.startedAt = Date.now();
    this.store.set(proposalId, "applying", proposal);
    let dispatched = false;
    try {
      const current = await this.base();
      const next = await this.model(proposal.candidate.id);
      const media = await this.checkModel(next);
      if (
        !same(current.model, proposal.current) ||
        !same(next, proposal.candidate) ||
        !same(media, proposal.media)
      )
        throw new Error("Base Earth changed since preview; prepare a fresh proposal");
      dispatched = true;
      await this.api.request(MODELS + "/" + next.id + "/set-base-earth", { method: "POST" });
      const result = await this.verifyBase(proposal);
      this.store.set(proposalId, "applied", { ...proposal, result });
      this.store.release(proposalId);
      this.store.event("base_earth_verified", { proposalId, modelId: next.id });
      return { operationId: proposalId, verified: true, result };
    } catch (e) {
      this.store.set(proposalId, dispatched ? "uncertain" : "failed", {
        ...proposal,
        error: e.message,
      });
      if (!dispatched) this.store.release(proposalId);
      throw new Error(`${e.message}; operationId=${proposalId}; no automatic replay`);
    }
  }
  async verifyBase(proposal) {
    const result = await this.base();
    if (
      result.model?.id !== proposal.candidate.id ||
      result.model.r2Key !== proposal.candidate.r2Key
    )
      throw new Error("Base Earth readback mismatch");
    if (proposal.current) {
      const old = await this.model(proposal.current.id);
      if (old.isBaseEarth || old.r2Key !== proposal.current.r2Key)
        throw new Error("Previous model was altered unexpectedly");
      await this.checkModel(old);
    }
    return result;
  }
  async reconcile({ operationId }) {
    this.local();
    uuid.parse(operationId);
    const c = this.store.get(operationId);
    if (!["visualizer", "visualizer-base"].includes(c.scope))
      throw new Error("Not a Visualizer operation");
    if (c.status === "applied") return { operationId, verified: true, result: c.result };
    if (!["uncertain", "applying"].includes(c.status))
      throw new Error("Operation has no unresolved write");
    if (c.status === "applying" && Date.now() - (c.startedAt ?? Date.now()) < 5 * 60 * 1000)
      throw new Error("Operation may still be running; wait before reconciliation");
    let result;
    if (c.kind === "set_base") result = await this.verifyBase(c);
    else if (["create_event", "update_event"].includes(c.kind)) {
      const matches = c.savedId
        ? [await this.event(c.savedId)]
        : (await this.events()).filter(
            (r) => r.slug === c.expected.slug && r.language === c.expected.language,
          );
      if (matches.length !== 1)
        throw new Error("Cannot establish write outcome; no retry permitted");
      result = await this.verifyEvent(matches[0].id, c.expected, c.expectedGroup);
    } else if (c.kind === "upload_glb") {
      if (!c.uploaded?.key || !c.expected)
        throw new Error(
          "Upload outcome/metadata stage unresolved; inspect operation log, do not upload again",
        );
      const matches = (await this.models()).filter((m) => m.r2Key === c.uploaded.key);
      if (matches.length !== 1)
        throw new Error(
          "R2 object may exist without model metadata; manual review required, never reupload automatically",
        );
      result = await this.verifyUpload(matches[0].id, c.expected, c.expectedFile.sha256);
    } else if (c.kind === "attach_model")
      result = await this.verifyAttachment(c.savedId, c.expectedGroup, c.before);
    else throw new Error("Unknown operation");
    this.store.set(c.id, "applied", { ...c, result });
    this.store.release(c.id);
    this.store.event("visualizer_reconciled", { operationId });
    return { operationId, verified: true, result };
  }
}
