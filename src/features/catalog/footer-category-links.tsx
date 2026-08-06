"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink } from "@/shared/ui/localized-link";

type RootCategory = { id: number; slug: string; name?: string | null };

export function FooterCategoryLinks() {
  const [categories, setCategories] = useState<RootCategory[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    void apiClient
      .request<{ data?: RootCategory[] }>(routes.api.categoryRoots, {
        cache: "no-store",
        signal: controller.signal,
      })
      .then((payload) => setCategories(payload.data ?? []))
      .catch(() => {
        if (!controller.signal.aborted) setCategories([]);
      });

    return () => controller.abort();
  }, [pathname]);

  return categories.map((category) => (
    <LocalizedLink
      href={`/search?category=${encodeURIComponent(category.slug)}`}
      key={category.id}
    >
      {category.name ?? category.slug}
    </LocalizedLink>
  ));
}
