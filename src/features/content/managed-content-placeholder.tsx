import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PublicContentContainer } from "./public-content-container";
import { getManagedPage } from "@/features/content/managed-content";
import type { AppLocale } from "@/shared/i18n/config";
import { RichText } from "@/shared/ui";

export type ManagedPageSlug = "about" | "safety" | "terms" | "privacy" | "contact";

export async function managedPageMetadata(slug: string, requestedLocale?: AppLocale): Promise<Metadata> {
  const locale = requestedLocale ?? (await getLocale()) as AppLocale;
  const page = await getManagedPage(slug, locale);
  return {
    title: page?.meta_title || page?.title,
    description: page?.meta_description || undefined,
    alternates: { canonical: `/${locale}/${slug}`, languages: { en: `/en/${slug}`, fa: `/fa/${slug}`, ps: `/ps/${slug}` } },
  };
}

export async function ManagedContentPlaceholder({ titleKey }: { titleKey: ManagedPageSlug }) {
  const t = await getTranslations("publicShell");
  const page = await getManagedPage(titleKey, (await getLocale()) as AppLocale);
  return <PublicContentContainer><article className="account-panel managed-page"><h1>{page?.title || t(titleKey)}</h1>{page ? <RichText html={page.content} className="managed-page-content" /> : <p>{t("managedContent")}</p>}</article></PublicContentContainer>;
}

export async function ManagedContentPage({ slug, locale }: { slug: string; locale: AppLocale }) {
  const page = await getManagedPage(slug, locale);
  if (!page) return null;
  return <PublicContentContainer><article className="account-panel managed-page"><h1>{page.title}</h1><RichText html={page.content} className="managed-page-content" /></article></PublicContentContainer>;
}
