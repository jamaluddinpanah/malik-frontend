import { cache } from "react";
import { env } from "@/shared/lib/env";
import type { AppLocale } from "@/shared/i18n/config";

export type ManagedPage = {
  id: number;
  slug: string;
  title: string;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
};

export type ManagedBanner = {
  id: number;
  placement: string;
  image_path: string;
  mobile_image_path?: string | null;
  target_url?: string | null;
  sort_order: number;
};

async function managedRequest<T>(
  path: string,
  locale: AppLocale,
  revalidate = 300,
): Promise<T | null> {
  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      headers: { Accept: "application/json", "Accept-Language": locale, "X-Malik-Locale": locale },
      ...(revalidate ? { next: { revalidate, tags: ["managed-content"] } } : { cache: "no-store" }),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: T };
    return payload.data ?? null;
  } catch {
    return null;
  }
}

export const getManagedPage = cache((slug: string, locale: AppLocale) =>
  managedRequest<ManagedPage>(`/api/v1/pages/${encodeURIComponent(slug)}`, locale),
);

export const getActiveBanners = cache((placement: string, locale: AppLocale) =>
  managedRequest<ManagedBanner[]>(`/api/v1/banners?placement=${encodeURIComponent(placement)}`, locale, 0),
);
