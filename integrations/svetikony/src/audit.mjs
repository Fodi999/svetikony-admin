import { CATALOG, entityNames, julianDate } from "./catalog.mjs";
export function relations(data) {
  const edges = [];
  const issues = [];
  for (const entity of entityNames)
    for (const row of data[entity] ?? []) {
      for (const [field, target] of Object.entries(CATALOG[entity].refs)) {
        if (!row[field]) continue;
        const found = (data[target] ?? []).find((x) => x.id === row[field]);
        const edge = {
          from: { entity, id: row.id },
          field,
          to: { entity: target, id: row[field] },
          targetExists: !!found,
        };
        edges.push(edge);
        if (!found) issues.push({ entity, id: row.id, field, code: "broken_relation" });
        else if (row.language && found.language && row.language !== found.language)
          issues.push({ entity, id: row.id, field, code: "cross_language_relation" });
        else if (row.status === "published" && found.status !== "published")
          issues.push({ entity, id: row.id, field, code: "published_to_draft" });
      }
    }
  return { edges, issues };
}
export function audit(data) {
  const issues = [...relations(data).issues];
  const titles = new Map();
  for (const entity of entityNames) {
    const slugs = new Map();
    const s = CATALOG[entity];
    for (const row of data[entity] ?? []) {
      const add = (code, field) =>
        issues.push({ entity, id: row.id, code, field, status: row.status });
      for (const field of new Set([...s.required, ...s.text]))
        if (!row[field]?.trim?.()) add("missing_content", field);
      if (s.image && !row[s.image]) add("missing_image", s.image);
      const key = `${row.language}:${row.slug}`;
      if (slugs.has(key)) add("duplicate_slug", "slug");
      slugs.set(key, row.id);
      if (s.strings.includes("seoTitle")) {
        if (!row.seoTitle?.trim()) add("missing_seo", "seoTitle");
        if (!row.seoDescription?.trim()) add("missing_seo", "seoDescription");
        const t = `${row.language}:${row.seoTitle?.trim().toLowerCase()}`;
        if (row.seoTitle && titles.has(t)) add("duplicate_seo_title", "seoTitle");
        titles.set(t, row.id);
        if (row.seoTitle?.length > 70) add("review_seo_length", "seoTitle");
      }
      if (entity === "calendar") {
        try {
          if (julianDate(row.dateNewStyle) !== row.dateOldStyle)
            add("date_pair_mismatch", "dateOldStyle");
        } catch {
          add("invalid_calendar_date", "dateNewStyle");
        }
      }
    }
  }
  return {
    counts: Object.fromEntries(entityNames.map((e) => [e, (data[e] ?? []).length])),
    issueCount: issues.length,
    issues,
    limits: [
      "This is a data audit, not a factual or theological verification.",
      "A database relation is not proof of a rendered HTML link.",
      "SEO length is an editorial hint, not a ranking guarantee.",
    ],
  };
}
export function coverage(data, year, language = "uk") {
  if (!Number.isInteger(year) || year < 1901 || year > 2099)
    throw new Error("Year must be 1901–2099");
  const days = [];
  const d = new Date(Date.UTC(year, 0, 1));
  while (d.getUTCFullYear() === year) {
    const date = d.toISOString().slice(0, 10);
    const rows = (data.calendar ?? []).filter(
      (r) => r.dateNewStyle === date && r.language === language,
    );
    const ids = new Set(rows.map((r) => r.id));
    const linked = Object.fromEntries(
      ["saints", "icons", "prayers", "gospel", "articles"].map((e) => [
        e,
        (data[e] ?? [])
          .filter((r) => ids.has(r.calendarDayId) && r.language === language)
          .map((r) => ({ id: r.id, status: r.status })),
      ]),
    );
    const missing = [];
    if (!rows.length) missing.push("calendar_day");
    if (rows.some((r) => r.dateOldStyle !== julianDate(date)))
      missing.push("matching_old_style_date");
    for (const field of ["description", "history", "seoTitle", "seoDescription"])
      if (!rows.length || rows.some((r) => !r[field]?.trim())) missing.push(field);
    for (const e of ["saints", "gospel"]) if (!linked[e].length) missing.push(e);
    days.push({
      date,
      ids: [...ids],
      published: rows.some((r) => r.status === "published"),
      missing,
      linked,
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return {
    year,
    language,
    totalDays: days.length,
    presentDays: days.filter((d) => d.ids.length).length,
    publishedDays: days.filter((d) => d.published).length,
    days,
    note: "Coverage describes stored fields and links. It does not certify correct commemorations/readings; missing saints can be legitimate for some day types. Images and audio are optional coverage dimensions.",
  };
}
