import type { ProductCategory } from "@/types/entities";

const now = new Date().toISOString();

/**
 * Phase MULTILINGUAL-1 (P1.2): seed data below stays UK-only, same as real
 * production D1 today (RU/EN columns exist but are empty until real
 * translations are populated — this phase makes the admin able to fill
 * them in, not populates them itself). `translations` is derived from
 * each entry's own flat `name`/`description` below rather than duplicated
 * by hand, so the two can never drift.
 */
const rawCategories: Omit<ProductCategory, "translations">[] = [
  {
    id: "cat-icons",
    name: "Ікони",
    slug: "ikony",
    description: "Писані та друковані ікони різних розмірів.",
    imageId: "media-category-icons",
    order: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cat-books",
    name: "Духовна література",
    slug: "duhovna-literatura",
    description: "Молитовники, богословська та історична література.",
    imageId: "media-category-books",
    order: 1,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cat-candles",
    name: "Свічки та лампадки",
    slug: "svichky-ta-lampadky",
    description: "Церковні свічки, лампадне масло, аксесуари.",
    order: 2,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cat-jewelry",
    name: "Хрестики та прикраси",
    slug: "hrestyky-ta-prykrasy",
    description: "Натільні хрестики, чотки, прикраси з православною символікою.",
    order: 3,
    active: false,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "cat-gifts",
    name: "Подарункові набори",
    slug: "podarunkovi-nabory",
    description: "Набори для хрещення, вінчання та інших подій.",
    order: 4,
    active: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const mockCategories: ProductCategory[] = rawCategories.map((category) => ({
  ...category,
  translations: {
    uk: { name: category.name, description: category.description ?? "" },
    ru: { name: "", description: "" },
    en: { name: "", description: "" },
  },
}));
