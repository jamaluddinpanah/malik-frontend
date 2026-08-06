import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import { AuthProvider } from "@/features/auth/auth-provider";
import { SiteChrome } from "@/shared/ui/site-chrome";
import {
  type AppLocale,
  defaultLocale,
  directionForLocale,
  isAppLocale,
  localeCookieName,
} from "@/shared/i18n/config";
import { messagesFor } from "@/shared/i18n/messages";
import { getTranslations } from "next-intl/server";
import { jsonLd } from "@/shared/lib/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"), title: { default: t("title"), template: `%s | ${t("title")}` }, description: t("description"), alternates: { canonical: "/", languages: { en: "/en", fa: "/fa", ps: "/ps" } } };
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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: "Malik", url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", potentialAction: { "@type": "SearchAction", target: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/search?q={search_term_string}`, "query-input": "required name=search_term_string" } }) }} />
            <SiteChrome>{children}</SiteChrome>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
