"use client";

import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiClient, type ApiResponse } from "@/lib/api";
import { routes } from "@/lib/routes";
import { LocalizedLink } from "@/presentation/components/localized-link";
import styles from "@/presentation/components/site-header.module.css";

type PublicCategory = { id: number; slug: string; name: string | null; children: PublicCategory[] };

function CategoryItems({ categories, depth = 0, onNavigate }: { categories: PublicCategory[]; depth?: number; onNavigate?: () => void }) {
  return <ul className={depth === 0 ? styles.categoryList : styles.categoryChildren}>{categories.map((category) => <li key={category.id}><LocalizedLink href={`/search?category=${encodeURIComponent(category.slug)}`} onClick={onNavigate}>{category.name ?? category.slug}</LocalizedLink>{category.children.length ? <CategoryItems categories={category.children} depth={depth + 1} onNavigate={onNavigate}/> : null}</li>)}</ul>;
}

/** Public API-backed category menu. It remains useful even when the API is unavailable. */
export function PublicCategoryNavigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const t = useTranslations("publicShell");
  const load = useCallback((signal?: AbortSignal) => apiClient.request<ApiResponse<PublicCategory[]>>(routes.api.categories, { signal }).then((response) => { setCategories(response.data); setState("ready"); }).catch(() => { if (!signal?.aborted) setState("error"); }), []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  if (compact) return <section aria-label={t("categories")}><LocalizedLink href="/search" onClick={onNavigate}>{t("browseCategories")}</LocalizedLink>{categories.length ? <CategoryItems categories={categories} onNavigate={onNavigate}/> : null}</section>;
  return <div className={styles.categoryMenu}><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Menu size={17}/> {t("categories")} <ChevronDown size={15}/></button>{open ? <div><LocalizedLink href="/search" onClick={() => setOpen(false)}>{t("allCategories")} <ChevronRight className={styles.directionalIcon} size={15}/></LocalizedLink>{categories.length ? <CategoryItems categories={categories} onNavigate={() => setOpen(false)}/> : state === "error" ? <span className={styles.categoryPlaceholder}>{t("categoryError")} <button type="button" onClick={() => { setState("loading"); void load(); }}>{t("retry")}</button></span> : <span className={styles.categoryPlaceholder}>{t("categoryLoading")}</span>}</div> : null}</div>;
}
