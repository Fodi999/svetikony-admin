// Only editorial API resources. No accounts, orders, billing, settings,
// Telegram sends, infrastructure, executable code, or 3D model operations.
export const CATALOG = {
  calendar: {
    path: "calendar-days",
    required: ["title", "slug", "dateNewStyle", "language"],
    text: ["description", "history"],
    image: "imageUrl",
    strings: [
      "dateOldStyle",
      "dateNewStyle",
      "calendarType",
      "title",
      "slug",
      "language",
      "dayType",
      "description",
      "history",
      "imageUrl",
      "seoTitle",
      "seoDescription",
    ],
    numbers: ["rank"],
    refs: {},
  },
  saints: {
    path: "saints",
    required: ["name", "slug", "language"],
    text: ["shortDescription", "biography"],
    image: "imageUrl",
    strings: [
      "slug",
      "name",
      "shortDescription",
      "biography",
      "feastDayOldStyle",
      "feastDayNewStyle",
      "imageUrl",
      "language",
    ],
    refs: { iconId: "icons", calendarDayId: "calendar" },
  },
  icons: {
    path: "icons",
    required: ["title", "slug", "language"],
    text: ["description"],
    image: "imageUrl",
    strings: ["title", "slug", "imageUrl", "saintName", "feastName", "description", "language"],
    arrays: ["galleryUrls"],
    refs: { calendarDayId: "calendar" },
  },
  prayers: {
    path: "prayers",
    required: ["title", "slug", "language", "text"],
    text: ["text"],
    image: "imageUrl",
    strings: [
      "slug",
      "title",
      "text",
      "audioUrl",
      "imageUrl",
      "source",
      "sourceUrl",
      "note",
      "language",
      "prayerType",
    ],
    refs: { iconId: "icons", calendarDayId: "calendar" },
  },
  articles: {
    path: "articles",
    required: ["title", "slug", "language", "content"],
    text: ["content"],
    strings: ["title", "slug", "content", "language", "seoTitle", "seoDescription"],
    refs: { iconId: "icons", calendarDayId: "calendar" },
  },
  gospel: {
    path: "gospel",
    required: ["title", "slug", "language", "reference", "text"],
    text: ["text", "explanation"],
    strings: ["slug", "title", "reference", "text", "explanation", "language"],
    refs: { iconId: "icons", calendarDayId: "calendar" },
  },
  alphabet: {
    path: "alphabet",
    required: ["letter", "name", "slug", "language"],
    text: ["shortDescription", "fullText"],
    image: "mainImageUrl",
    strings: [
      "slug",
      "letter",
      "name",
      "shortDescription",
      "fullText",
      "modernEquivalent",
      "cardImageUrl",
      "mainImageUrl",
      "seoTitle",
      "seoDescription",
      "audioUrl",
      "language",
    ],
    numbers: ["sortOrder", "numericValue"],
    refs: {},
  },
};
export const entityNames = Object.keys(CATALOG);
export function spec(entity) {
  if (!Object.hasOwn(CATALOG, entity)) throw new Error("Unsupported editorial entity");
  return CATALOG[entity];
}
export function safeId(id) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,120}$/.test(id))
    throw new Error("Invalid entity ID");
  return id;
}
export function entityPath(entity, id) {
  return `/api/admin/church-content/${spec(entity).path}${id ? "/" + safeId(id) : ""}`;
}
export function civilDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Expected YYYY-MM-DD");
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error("Invalid civil date");
  const year = date.getUTCFullYear();
  if (year < 1901 || year > 2099) throw new Error("Calendar operator supports 1901–2099");
  return date;
}
// Within this explicitly supported interval the offset is 13 days.
export function julianDate(value) {
  const d = civilDate(value);
  d.setUTCDate(d.getUTCDate() - 13);
  return d.toISOString().slice(0, 10);
}
export function normalizePatch(entity, patch) {
  const s = spec(entity);
  if (
    !patch ||
    Array.isArray(patch) ||
    typeof patch !== "object" ||
    Object.keys(patch).length === 0
  )
    throw new Error("Nonempty patch required");
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (entity === "calendar" && key === "imageMetadata") {
      if (
        value !== null &&
        (typeof value !== "object" ||
          value.origin !== "ai_generated" ||
          value.identityVerified !== false ||
          Object.keys(value).some((k) => !["origin", "identityVerified"].includes(k)))
      )
        throw new Error("Image metadata must honestly mark an unverified AI illustration");
      out[key] = value;
      continue;
    }
    if (entity === "calendar" && ["seoTitle", "seoDescription"].includes(key) && value === null) {
      out[key] = null;
      continue;
    }
    if (Object.hasOwn(s.refs, key)) {
      out[key] = value === null ? null : safeId(value);
      continue;
    }
    if (s.strings.includes(key)) {
      if (typeof value !== "string" || value.length > 100000)
        throw new Error("Invalid text field: " + key);
      if (key === "language" && !["uk", "ru", "en"].includes(value))
        throw new Error("Unsupported language");
      if (key === "slug" && (!value || /[\s/?#\\]/.test(value))) throw new Error("Invalid slug");
      if (/Url$/.test(key) && value && !/^(https:\/\/|\/?media\/)/.test(value))
        throw new Error("Expected HTTPS URL or media key: " + key);
      out[key] = value;
      continue;
    }
    if (s.numbers?.includes(key)) {
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value)))
        throw new Error("Invalid numeric field");
      out[key] = value;
      continue;
    }
    if (s.arrays?.includes(key)) {
      if (
        !Array.isArray(value) ||
        value.length > 50 ||
        value.some((v) => typeof v !== "string" || !/^https:\/\/|^\/?media\//.test(v))
      )
        throw new Error("Invalid media array");
      out[key] = value;
      continue;
    }
    throw new Error("Field is not writable through the plugin: " + key);
  }
  if (entity === "calendar") {
    if (Object.hasOwn(out, "dateOldStyle") && !out.dateNewStyle)
      throw new Error("Set the civil date; old-style date is computed and checked");
    if (out.dateNewStyle) {
      const old = julianDate(out.dateNewStyle);
      if (out.dateOldStyle && out.dateOldStyle !== old) throw new Error("Calendar dates disagree");
      out.dateOldStyle = old;
      out.calendarType = "both";
    }
  }
  return out;
}
export function writableSnapshot(entity, row) {
  const s = spec(entity);
  return Object.fromEntries(
    [
      ...s.strings,
      ...(s.numbers ?? []),
      ...(s.arrays ?? []),
      ...Object.keys(s.refs),
      ...(entity === "calendar" ? ["imageMetadata"] : []),
    ]
      .filter((k) => Object.hasOwn(row, k))
      .map((k) => [k, row[k]]),
  );
}
export function contentView(entity, row) {
  return {
    id: row.id,
    ...writableSnapshot(entity, row),
    status: row.status,
    translationGroupId: row.translationGroupId,
    updatedAt: row.updatedAt,
  };
}
