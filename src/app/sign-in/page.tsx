import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { defaultLocale, isAppLocale } from "@/i18n/config";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const localeHeader = (await headers()).get("x-malik-locale") ?? undefined;
  const locale = isAppLocale(localeHeader) ? localeHeader : defaultLocale;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(`/${locale}/login${query.size ? `?${query}` : ""}`);
}
