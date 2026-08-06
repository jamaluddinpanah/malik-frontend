"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink } from "@/shared/ui/localized-link";
import { categoryIconMap } from "@/features/catalog/category-icons";

export type NavigationLocation = "header" | "mobile" | "footer_company" | "footer_help" | "footer_legal";

type NavigationItem = { slug: string; title: string; icon?: string | null };

export function ManagedNavigationLinks({ location, onNavigate, prefix }: { location: NavigationLocation; onNavigate?: () => void; prefix?: ReactNode }) {
  const [items, setItems] = useState<NavigationItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    void apiClient.request<{ data?: NavigationItem[] }>(routes.api.pageNavigation(location), { cache: "no-store", signal: controller.signal })
      .then((payload) => setItems(payload.data ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      });
    return () => controller.abort();
  }, [location, pathname]);

  if (!items.length) return null;

  return <>{prefix}{items.map((item) => { const Icon = item.icon && Object.hasOwn(categoryIconMap, item.icon) ? categoryIconMap[item.icon] : undefined; return <LocalizedLink href={`/${item.slug}`} key={item.slug} onClick={onNavigate}>{Icon ? <Icon className="managed-navigation-icon" size={14} aria-hidden="true" /> : null}{item.title}</LocalizedLink>; })}</>;
}
