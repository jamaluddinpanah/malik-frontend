import { NextRequest, NextResponse } from "next/server";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
} from "./src/shared/i18n/config";

function preferredLocale(request: NextRequest) {
  const saved = request.cookies.get(localeCookieName)?.value;
  if (isAppLocale(saved)) return saved;

  const browserLocale = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((item, position) => {
      const match = item
        .trim()
        .match(
          /^([a-z]{2,3})(?:-[a-z0-9-]+)?(?:\s*;\s*q=(0(?:\.\d{1,3})?|1(?:\.0{1,3})?))?$/i,
        );
      return match
        ? {
            locale: match[1].toLowerCase(),
            quality: match[2] ? Number(match[2]) : 1,
            position,
          }
        : null;
    })
    .filter(
      (item): item is { locale: string; quality: number; position: number } =>
        Boolean(item && item.quality > 0 && isAppLocale(item.locale)),
    )
    .sort(
      (left, right) =>
        right.quality - left.quality || left.position - right.position,
    )[0]?.locale;
  return isAppLocale(browserLocale) ? browserLocale : defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segments = pathname.split("/");
  const requestedLocale = segments[1];

  if (!isAppLocale(requestedLocale)) {
    const locale = preferredLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    const response = NextResponse.redirect(url);
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    return response;
  }

  const locale = requestedLocale;
  const currentCookieLocale = request.cookies.get(localeCookieName)?.value;

  const headers = new Headers(request.headers);
  headers.set("x-malik-locale", locale);

  // The request header gives the root layout its locale on the first render;
  // update the preference cookie without an extra redirect or a lost query.
  const response = NextResponse.next({ request: { headers } });
  if (currentCookieLocale !== locale) {
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml|assets).*)"],
};
