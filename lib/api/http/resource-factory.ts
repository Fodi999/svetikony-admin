import { httpGet } from "@/lib/api/http/transport";
import { matchesSearch, paginate } from "@/lib/api/mock-utils";
import { ApiError } from "@/types/api";
import type { ListQuery, PaginatedResult } from "@/types/api";

/**
 * Template for every future read-only HttpApiAdapter resource (Saints,
 * Articles, Prayers, Icons, Calendar, ...) — extracted from what Alphabet
 * READ already needed. Each new module should only need to supply the
 * config below, not re-implement fetch/search/sort/pagination/error-guard
 * plumbing. Reuses the same `paginate`/`matchesSearch` the mock adapter
 * already relies on (lib/api/mock-utils.ts) instead of a second copy.
 *
 * Every resource built this way starts READ-only: create/update/remove/
 * createTranslation all throw a controlled `not_implemented` ApiError until
 * a module is explicitly authorized to connect CRUD.
 */
export function notImplementedError(): never {
  throw new ApiError("not_implemented", "Операція поки не підключена.");
}

interface HttpListResourceConfig<TDto, TEntity, TQuery extends ListQuery> {
  /** Same-origin BFF path for the list endpoint, e.g. BFF_ENDPOINTS.alphabetLetters. */
  listPath: string;
  /** Same-origin BFF path for a single item, given its id. */
  itemPath: (id: string) => string;
  /** DTO -> admin entity. Keep this the only place backend field names/shapes appear. */
  toEntity: (dto: TDto) => TEntity;
  /**
   * Query params the backend genuinely supports server-side (e.g.
   * `language`). Everything else on TQuery (search/page/pageSize) is always
   * applied client-side below, since svet-ikony's list endpoints don't
   * support them — do not assume a future module's backend differs without
   * verifying it first.
   */
  buildBackendParams?: (query?: TQuery) => URLSearchParams;
  /** Entity fields to search across, e.g. (letter) => [letter.name, letter.slug]. */
  searchFields?: (entity: TEntity) => (string | undefined)[];
  /**
   * Arbitrary client-side predicate beyond free-text search — e.g. Prayers'
   * `status` filter, which the UI sends in the query but svet-ikony's list
   * endpoint doesn't support server-side. Applied before searchFields/sort.
   * Keep this to simple equality-style checks; a filter needing data the
   * entity doesn't have (e.g. Products needing categoryId/active/featured,
   * or Calendar needing joins across other endpoints) is a sign this module
   * needs more than this factory — see the Stage 2B ResourceFactory audit.
   */
  filter?: (entity: TEntity, query?: TQuery) => boolean;
  /** Client-side sort applied after mapping, e.g. by a stable `order` field. */
  sort?: (a: TEntity, b: TEntity) => number;
}

export function createHttpListResource<TDto, TEntity, TQuery extends ListQuery>(
  config: HttpListResourceConfig<TDto, TEntity, TQuery>,
) {
  return {
    async list(query?: TQuery): Promise<PaginatedResult<TEntity>> {
      const params = config.buildBackendParams?.(query);
      const qs = params?.toString();
      const dtos = await httpGet<TDto[]>(qs ? `${config.listPath}?${qs}` : config.listPath);
      let items = dtos.map(config.toEntity);
      if (config.filter) items = items.filter((entity) => config.filter!(entity, query));
      if (config.searchFields) {
        items = items.filter((entity) => matchesSearch(config.searchFields!(entity), query?.search));
      }
      if (config.sort) items = [...items].sort(config.sort);
      return paginate(items, query);
    },

    async get(id: string): Promise<TEntity> {
      const dto = await httpGet<TDto>(config.itemPath(id));
      return config.toEntity(dto);
    },

    async create(): Promise<TEntity> {
      notImplementedError();
    },
    async update(): Promise<TEntity> {
      notImplementedError();
    },
    async remove(): Promise<void> {
      notImplementedError();
    },
    async createTranslation(): Promise<TEntity> {
      notImplementedError();
    },
  };
}
