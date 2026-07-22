/** Laravel's conventional JSON envelope. */
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

/** Laravel LengthAwarePaginator response returned directly from an endpoint. */
export type LaravelPagination<T> = {
  data: T[];
  current_page: number;
  from: number | null;
  last_page: number;
  links: LaravelPaginationLink[];
  path: string;
  per_page: number;
  to: number | null;
  total: number;
  first_page_url?: string | null;
  last_page_url?: string | null;
  next_page_url?: string | null;
  prev_page_url?: string | null;
};

export type LaravelPaginationLink = {
  url: string | null;
  label: string;
  active: boolean;
};

export type PaginatedApiResponse<T> = ApiResponse<LaravelPagination<T>>;
export type LaravelCursorPagination<T> = {
  data: T[];
  path: string;
  per_page: number;
  next_cursor: string | null;
  next_page_url: string | null;
  prev_cursor: string | null;
  prev_page_url: string | null;
};
export type CursorPaginatedApiResponse<T> = ApiResponse<
  LaravelCursorPagination<T>
>;
export type FieldErrors = Record<string, string[]>;
