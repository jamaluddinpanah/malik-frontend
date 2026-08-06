import { env } from "@/shared/lib/env";
import { clientLocale } from "@/shared/i18n/config";
import type { FieldErrors } from "@/shared/types/api";
import { ApiError } from "./api-error";

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
  locale?: string;
};

type LaravelErrorPayload = { message?: string; errors?: FieldErrors };

function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith("XSRF-TOKEN="));
  return cookie ? decodeURIComponent(cookie.slice("XSRF-TOKEN=".length)) : undefined;
}

function isJsonObject(value: ApiRequestOptions["body"]): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !(value instanceof FormData) && !(value instanceof Blob) && !(value instanceof URLSearchParams) && !(value instanceof ArrayBuffer);
}

function retryAfter(response: Response): number | null {
  const value = response.headers.get("Retry-After");
  return value && /^\d+$/.test(value) ? Number(value) : null;
}

/** The only HTTP client for requests from Malik's browser application. */
export class ApiClient {
  constructor(private readonly baseUrl = env.apiUrl) {}

  async csrfCookie(signal?: AbortSignal, locale = clientLocale()): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sanctum/csrf-cookie`, {
      credentials: "include",
      signal,
      headers: { Accept: "application/json", "Accept-Language": locale, "X-Malik-Locale": locale },
    });
    if (!response.ok) throw new ApiError("Unable to start a secure session. Please try again.", response.status, {}, undefined, retryAfter(response));
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const locale = options.locale ?? clientLocale();
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("Accept-Language", locale);
    headers.set("X-Malik-Locale", locale);

    const method = (options.method ?? "GET").toUpperCase();
    const requestBody = options.body;
    const jsonBody = isJsonObject(requestBody);
    const body: BodyInit | undefined = requestBody === undefined
      ? undefined
      : jsonBody
        ? JSON.stringify(requestBody)
        : requestBody;
    if (jsonBody) headers.set("Content-Type", "application/json");
    if (!new Set(["GET", "HEAD", "OPTIONS"]).has(method)) {
      const token = csrfToken();
      if (token) headers.set("X-XSRF-TOKEN", token);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        credentials: "include",
        headers,
        body,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw new ApiError("Unable to reach Malik. Check that the API is running and try again.", 0);
    }

    if (response.status === 204) return undefined as T;
    const payload = await response.json().catch(() => ({})) as LaravelErrorPayload;
    if (!response.ok) throw new ApiError(payload.message ?? "Something went wrong. Please try again.", response.status, payload.errors ?? {}, undefined, retryAfter(response));
    return payload as T;
  }
}

export const apiClient = new ApiClient();
