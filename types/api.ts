/**
 * Transport-level shapes used by ApiClient implementations (mock and HTTP).
 * These are intentionally generic; Stage 2 must confirm the real API's
 * envelope shape and adjust HttpApiAdapter + these types together.
 */

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ApiErrorCode =
  | "network_error"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "server_error"
  | "not_implemented"
  | "unknown";

export interface ApiFieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  code: ApiErrorCode;
  status?: number;
  fieldErrors?: ApiFieldError[];

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { status?: number; fieldErrors?: ApiFieldError[] },
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = options?.status;
    this.fieldErrors = options?.fieldErrors;
  }
}

export interface ListQuery extends PaginationParams {
  search?: string;
  sort?: string;
}

/**
 * Stage 2D: the response shape of svet-ikony's real R2-backed media upload
 * endpoint (see svet-ikony's lib/media/types.ts — kept identical on purpose,
 * this is the one contract both projects agree on). Deliberately small.
 */
export type MediaKind = "image" | "audio";

export interface MediaObjectDto {
  key: string;
  url: string;
  contentType: string;
  size: number;
  etag?: string;
  kind: MediaKind;
}
