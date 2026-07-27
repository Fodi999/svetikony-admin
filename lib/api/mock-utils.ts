import { ApiError } from "@/types/api";
import type { ListQuery, PaginatedResult } from "@/types/api";

/** Simulated network latency so loading states are actually exercised in the UI. */
export function mockDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function paginate<T>(items: T[], query?: ListQuery): PaginatedResult<T> {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 20;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}

export function matchesSearch(haystacks: (string | undefined)[], search?: string): boolean {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some((value) => value?.toLowerCase().includes(needle));
}

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function notFound(entity: string): never {
  throw new ApiError("not_found", `${entity} не знайдено`, { status: 404 });
}

const STORAGE_PREFIX = "svetikony-admin.mock-store.";

/**
 * Stage-1 mock stores start from the seed data in lib/mock-data on first
 * load, then persist CRUD changes to sessionStorage so created/edited/
 * deleted records survive a page refresh within the same tab. This is
 * explicitly separate from any future production data path (see
 * lib/api/http-adapter.ts) and resets whenever sessionStorage is cleared.
 */
export function loadStore<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return [...seed];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // Corrupt storage: fall back to seed data.
  }
  return [...seed];
}

export function saveStore<T>(key: string, store: T[]): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(store));
}

/** Clears all persisted mock CRUD changes, restoring the seed data on next reload. */
export function resetAllMockStores(): void {
  if (typeof window === "undefined") return;
  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(STORAGE_PREFIX))
    .forEach((key) => window.sessionStorage.removeItem(key));
}

export function ensureUniqueSlug(params: {
  items: { id: string; slug: string; language?: string }[];
  slug: string;
  language?: string;
  excludeId?: string;
}): void {
  const conflict = params.items.find(
    (item) =>
      item.id !== params.excludeId &&
      item.slug === params.slug &&
      (params.language === undefined || item.language === params.language),
  );
  if (conflict) {
    throw new ApiError("conflict", `Запис зі slug «${params.slug}» вже існує`, {
      status: 409,
      fieldErrors: [{ path: "slug", message: "Такий slug вже використовується" }],
    });
  }
}
