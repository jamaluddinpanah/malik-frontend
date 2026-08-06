"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { withActiveLocale } from "@/shared/ui/localized-link";

export function SearchForm({ initial = "", category = "" }: { initial?: string; category?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("home");
  const [query, setQuery] = useState(initial);
  const [selectedCategory, setSelectedCategory] = useState(category);

  return <form className="search-form" onSubmit={event => {
    event.preventDefault();
    router.push(withActiveLocale(`/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(selectedCategory)}`, pathname) as string);
  }}>
    <select aria-label={t("allCategories")} value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)}>
      <option value="">{t("allCategories")}</option>
      <option value="vehicles">{t("vehicles")}</option>
       <option value="real-estate">{t("realEstate")}</option>
       <option value="goods">{t("goods")}</option>
       <option value="jobs">{t("jobs")}</option>
    </select>
    <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("searchPlaceholder")}/>
    <button>{t("search")}</button>
  </form>;
}
