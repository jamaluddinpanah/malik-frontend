import type { FieldErrors } from "@/shared/types/api";

export type ApiErrorKind =
  | "network"
  | "unauthenticated"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "validation"
  | "rate-limited"
  | "server"
  | "unexpected";

export function apiErrorKind(status: number): ApiErrorKind {
  if (status === 0) return "network";
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 422) return "validation";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server";
  return "unexpected";
}

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;

  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: FieldErrors = {},
    kind?: ApiErrorKind,
    public readonly retryAfter: number | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind ?? apiErrorKind(status);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
