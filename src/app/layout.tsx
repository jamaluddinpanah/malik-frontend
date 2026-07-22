import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { AuthProvider } from "@/presentation/auth/auth-provider";
import { SiteChrome } from "@/presentation/components/site-chrome";
import {
  type AppLocale,
  defaultLocale,
  directionForLocale,
  isAppLocale,
  localeCookieName,
} from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const requestedLocale = requestHeaders.get("x-malik-locale") ?? undefined;
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale: AppLocale = isAppLocale(requestedLocale)
    ? requestedLocale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : defaultLocale;

  return (
    <html lang={locale} dir={directionForLocale(locale)}>
      <body dir={directionForLocale(locale)}>
        <NextIntlClientProvider locale={locale} messages={messagesFor(locale)}>
          <AuthProvider>
            <SiteChrome>{children}</SiteChrome>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
