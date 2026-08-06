import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locales, defaultLocale, isAppLocale } from "@/shared/i18n/config";
import HomePage from "../page";
import { ManagedContentPage, managedPageMetadata } from "@/features/content/managed-content-placeholder";
import { getManagedPage } from "@/features/content/managed-content";

export default async function LocaleOrManagedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (isAppLocale(locale)) return <HomePage />;
  if (!await getManagedPage(locale, defaultLocale)) notFound();
  return <ManagedContentPage slug={locale} locale={defaultLocale} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return managedPageMetadata(locale, defaultLocale);
  return { alternates: { canonical: `/${locale}`, languages: Object.fromEntries(locales.map((item) => [item, `/${item}`])) } };
}
