"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { isAppLocale } from "@/shared/i18n/config";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: LinkProps["href"] };

export function withActiveLocale(href: LinkProps["href"], pathname: string): LinkProps["href"] {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return href;
  const locale = pathname.split("/")[1];
  if (!isAppLocale(locale) || /^\/(en|fa|ps)(?=\/|$)/.test(href)) return href;
  return `/${locale}${href}`;
}

/** Keeps internal navigation inside the active `/en`, `/fa`, or `/ps` route tree. */
export function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const pathname = usePathname();
  return <Link href={withActiveLocale(href, pathname)} {...props} />;
}
