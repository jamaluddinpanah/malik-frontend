"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { defaultLocale, directionForLocale, isAppLocale } from "@/shared/i18n/config";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeLocale = pathname.split("/")[1];
  const locale = isAppLocale(routeLocale) ? routeLocale : defaultLocale;
  const routePath = pathname.replace(/^\/(en|fa|ps)(?=\/|$)/, "") || "/";

  const content = routePath === "/admin" || routePath.startsWith("/admin/")
    ? children
    : <><SiteHeader />{children}<SiteFooter /></>;

  return <div className="site-chrome" lang={locale} dir={directionForLocale(locale)} data-malik-locale={locale}>{content}</div>;
}
