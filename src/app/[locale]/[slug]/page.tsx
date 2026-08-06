import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagedContentPage, managedPageMetadata } from "@/features/content/managed-content-placeholder";
import { getManagedPage } from "@/features/content/managed-content";
import { isAppLocale, type AppLocale } from "@/shared/i18n/config";

export async function generateMetadata({ params }: { params: Promise<{ locale: AppLocale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return managedPageMetadata(slug, locale);
}

export default async function LocalizedDynamicManagedPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isAppLocale(locale) || !await getManagedPage(slug, locale)) notFound();
  return <ManagedContentPage slug={slug} locale={locale} />;
}
