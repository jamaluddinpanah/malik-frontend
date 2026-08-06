import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { type AppLocale, defaultLocale, isAppLocale, localeCookieName } from "./config";
import { messagesFor } from "./messages";

export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get("x-malik-locale") ?? undefined;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale: AppLocale = isAppLocale(headerLocale)
    ? headerLocale
    : isAppLocale(cookieLocale)
      ? cookieLocale
      : defaultLocale;

  return {
    locale,
    messages: messagesFor(locale),
  };
});
