export const locales = ["en", "fa", "ps"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "en";
export const localeCookieName = "NEXT_LOCALE";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

export function directionForLocale(locale: AppLocale): "ltr" | "rtl" {
  return locale === "en" ? "ltr" : "rtl";
}

export function clientLocale(): AppLocale {
  if (typeof document === "undefined") return defaultLocale;
  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${localeCookieName}=`))
    ?.split("=")[1];
  return isAppLocale(value) ? value : defaultLocale;
}

/** Switch locale without losing the browser-visible route, query, or fragment. */
export function switchClientLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  document.cookie = `${localeCookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  const remainder =
    window.location.pathname.replace(/^\/(en|fa|ps)(?=\/|$)/, "") || "/";
  const pathname = `/${locale}${remainder === "/" ? "" : remainder}`;
  window.location.assign(
    `${pathname}${window.location.search}${window.location.hash}`,
  );
}
