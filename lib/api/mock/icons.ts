import type { ApiClient } from "@/lib/api/client";
import { ensureUniqueSlug, loadStore, matchesSearch, mockDelay, notFound, nextId, nowIso, paginate, saveStore } from "@/lib/api/mock-utils";
import { mockIcons } from "@/lib/mock-data/icons";
import { ApiError } from "@/types/api";
import type { GeneratedIconPortfolioPhoto, Icon, IconAiField, IconAiFillResult, IconAiWriteResult, IconPortfolioPreset } from "@/types/entities";

const STORE_KEY = "icons";
const store: Icon[] = loadStore(STORE_KEY, mockIcons);
const persist = () => saveStore(STORE_KEY, store);

function getOrThrow(id: string): Icon {
  const found = store.find((i) => i.id === id);
  if (!found) notFound("Ікона");
  return found;
}

function save(id: string, patch: Partial<Icon>): Icon {
  const index = store.findIndex((i) => i.id === id);
  if (index === -1) notFound("Ікона");
  const updated: Icon = { ...store[index], ...patch, updatedAt: nowIso() };
  store[index] = updated;
  persist();
  return updated;
}

/** Mock mode has no real proposal system -- every generate/regenerate/
 * fill-missing action here always simulates the direct-write outcome,
 * matching Calendar Day's own mock adapter convention (Stage 1 dev
 * fallback only). */
function direct(icon: Icon): IconAiWriteResult {
  return { mode: "direct", icon };
}

export const iconsResource: ApiClient["icons"] = {
  async list(query) {
    await mockDelay();
    let items = [...store];
    if (query?.language) items = items.filter((i) => i.language === query.language);
    if (query?.status) items = items.filter((i) => i.status === query.status);
    items = items.filter((i) => matchesSearch([i.title, i.description, i.slug], query?.search));
    items.sort((a, b) => a.title.localeCompare(b.title));
    return paginate(items, query);
  },

  async get(id) {
    await mockDelay();
    const found = store.find((i) => i.id === id);
    if (!found) notFound("Ікона");
    return found;
  },

  async create(values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const groupId = nextId("icon-grp");
    const entity: Icon = {
      id: `${groupId}-${values.language}`,
      translationGroupId: groupId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...values,
    };
    store.push(entity);
    persist();
    return entity;
  },

  async update(id, values) {
    await mockDelay();
    const index = store.findIndex((i) => i.id === id);
    if (index === -1) notFound("Ікона");
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language, excludeId: id });
    const updated: Icon = { ...store[index], ...values, updatedAt: nowIso() };
    store[index] = updated;
    persist();
    return updated;
  },

  async remove(id) {
    await mockDelay();
    const index = store.findIndex((i) => i.id === id);
    if (index === -1) notFound("Ікона");
    store.splice(index, 1);
    persist();
  },

  async createTranslation(groupId, language, values) {
    await mockDelay();
    ensureUniqueSlug({ items: store, slug: values.slug, language: values.language });
    const entity: Icon = {
      id: `${groupId}-${language}`,
      translationGroupId: groupId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...values,
    };
    store.push(entity);
    persist();
    return entity;
  },
  async generateDescription(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    if (icon.description.trim()) throw new ApiError("conflict", "Опис вже існує -- скористайтеся регенерацією");
    return direct(save(id, { description: `Мок-опис для "${icon.title}".` }));
  },
  async regenerateDescription(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    return direct(save(id, { description: `Новий мок-опис для "${icon.title}".` }));
  },
  async generateHistory(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    if (icon.history?.trim()) throw new ApiError("conflict", "Текст вже існує -- скористайтеся регенерацією");
    return direct(save(id, { history: `Мок-історична довідка для "${icon.title}".` }));
  },
  async regenerateHistory(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    return direct(save(id, { history: `Новий мок-текст для "${icon.title}".` }));
  },
  async generateSaintImageDescription(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    if (icon.saintImageDescription?.trim()) throw new ApiError("conflict", "Опис вже існує -- скористайтеся регенерацією");
    return direct(save(id, { saintImageDescription: `Мок-опис образу для "${icon.title}".` }));
  },
  async regenerateSaintImageDescription(id) {
    await mockDelay(400);
    const icon = getOrThrow(id);
    return direct(save(id, { saintImageDescription: `Новий мок-опис образу для "${icon.title}".` }));
  },
  async fillMissing(id): Promise<IconAiFillResult> {
    await mockDelay(800);
    const icon = getOrThrow(id);
    // Mock mode has no real proposal system -- always simulates the
    // direct-write outcome, matching Calendar Day's own convention.
    const filled: IconAiField[] = [];
    let current = icon;
    if (!current.description.trim()) {
      current = save(id, { description: `Мок-опис для "${current.title}".` });
      filled.push("description");
    }
    if (!current.history?.trim()) {
      current = save(id, { history: `Мок-історична довідка для "${current.title}".` });
      filled.push("history");
    }
    if (!current.saintImageDescription?.trim()) {
      current = save(id, { saintImageDescription: `Мок-опис образу для "${current.title}".` });
      filled.push("saintImageDescription");
    }
    return { mode: "direct", icon: current, filled, skipped: [] };
  },
  async generatePortfolio(id) {
    await mockDelay(600);
    const icon = getOrThrow(id);
    if (!icon.mainImageId) throw new ApiError("validation_error", "Спочатку завантажте фото ікони");
    const sourceImageUrl = icon.mainImageId;
    const generatedAt = nowIso();
    const presets: IconPortfolioPreset[] = ["table_candle", "in_hand", "framed_wall"];
    const generated: GeneratedIconPortfolioPhoto[] = presets.map((preset) => ({
      preset,
      imageUrl: `${sourceImageUrl}#mock-portfolio-${preset}-${nextId("portfolio")}`,
      sourceImageUrl,
      generatedAt,
    }));
    return { icon, generated, skipped: [] };
  },
  async addPortfolioImages(id, images) {
    await mockDelay(300);
    const icon = getOrThrow(id);
    if (!images.length) throw new ApiError("validation_error", "Немає фото для додавання");
    const galleryImageIds = [...icon.galleryImageIds];
    for (const image of images) if (!galleryImageIds.includes(image.imageUrl)) galleryImageIds.push(image.imageUrl);
    return direct(save(id, { galleryImageIds }));
  },
};
