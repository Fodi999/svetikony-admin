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
