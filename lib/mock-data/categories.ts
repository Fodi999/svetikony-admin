import type { ProductCategory } from "@/types/entities";

const now = new Date().toISOString();

export const mockCategories: ProductCategory[] = [
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
