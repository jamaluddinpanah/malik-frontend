"use client";

import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BriefcaseBusiness,
  Car,
  ChevronDown,
  ChevronRight,
  Construction,
  History,
  House,
  Menu,
  Monitor,
  PawPrint,
  PlusSquare,
  ShoppingBag,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/features/listings/entities";
import styles from "./category-sidebar.module.css";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/shared/lib/formatting/locale";
import type { AppLocale } from "@/shared/i18n/config";
import { categoryIconMap } from "@/features/catalog/category-icons";

const categoryIcons: Record<string, LucideIcon> = {
  vehicles: Car,
  "real-estate": House,
  electronics: Monitor,
  goods: ShoppingBag,
  jobs: BriefcaseBusiness,
  services: Wrench,
  pets: PawPrint,
  construction: Construction,
};
type CategoryTree = Map<string | undefined, Category[]>;

function CategoryBranch({
  category,
  tree,
  depth,
  expanded,
  collapsed,
  onToggle,
  onNavigate,
  activeSlug,
  activePath,
}: {
  category: Category;
  tree: CategoryTree;
  depth: number;
  expanded: Set<string>;
  collapsed: Set<string>;
  onToggle: (slug: string) => void;
  onNavigate: () => void;
  activeSlug: string;
  activePath: Set<string>;
}) {
  const t = useTranslations("categories");
  const locale = useLocale() as AppLocale;
  const children = tree.get(category.slug) ?? [];
  const hasChildren = children.length > 0;
  const isActive = category.slug === activeSlug;
  const isOpen = !collapsed.has(category.slug) && (expanded.has(category.slug) || activePath.has(category.slug));
  const Icon = (category.icon && categoryIconMap[category.icon]) || categoryIcons[category.slug] || ShoppingBag;
  const categoryLabel = t.has(`names.${category.slug}`)
    ? t(`names.${category.slug}`)
    : category.name;
  return (
    <li>
      <div
         className={`${styles.row} ${depth === 0 ? styles.root : styles.child} ${isActive ? styles.activeRow : ""}`}
        style={{ "--depth": depth } as React.CSSProperties}
      >
        {hasChildren ? (
          <button
            className={styles.toggle}
            onClick={() => onToggle(category.slug)}
            aria-expanded={isOpen}
            aria-label={t(isOpen ? "collapse" : "expand", {
              category: categoryLabel,
            })}
          >
            {isOpen ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight className={styles.directionalIcon} size={15} />
            )}
          </button>
        ) : null}
        <Link
          href={`/search?category=${category.slug}`}
          className={`${styles.categoryLink} ${!hasChildren ? styles.leafLink : ""} ${isActive ? styles.active : ""}`}
          onClick={onNavigate}
        >
          <em>{depth === 0 ? <Icon size={18} /> : null}</em>
          <span>{categoryLabel}</span>
          <small>{formatNumber(category.listingCount, locale)}</small>
        </Link>
      </div>
      {hasChildren && isOpen ? (
        <ul className={styles.children}>
          {children.map((child) => (
            <CategoryBranch
              key={child.slug}
              category={child}
              tree={tree}
              depth={depth + 1}
              expanded={expanded}
              collapsed={collapsed}
              onToggle={onToggle}
              onNavigate={onNavigate}
              activeSlug={activeSlug}
              activePath={activePath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CategorySidebar({ categories }: { categories: Category[] }) {
  const t = useTranslations("categories");
  const locale = useLocale() as AppLocale;
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("category") ?? "";
  const activeRootSlug = useMemo(() => {
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    let current = bySlug.get(activeSlug);
    while (current?.parentSlug) current = bySlug.get(current.parentSlug);
    return current?.slug ?? "";
  }, [activeSlug, categories]);
  const visibleCategories = useMemo(() => {
    if (!activeRootSlug) return categories;
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    return categories.filter((category) => {
      let current: Category | undefined = category;
      while (current?.parentSlug) current = bySlug.get(current.parentSlug);
      return current?.slug === activeRootSlug;
    });
  }, [activeRootSlug, categories]);
  const tree = useMemo(
    () =>
      visibleCategories.reduce<CategoryTree>((map, category) => {
        const bucket = map.get(category.parentSlug) ?? [];
        bucket.push(category);
        map.set(category.parentSlug, bucket);
        return map;
      }, new Map()),
    [visibleCategories],
  );
  const activePath = useMemo(() => {
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const path = new Set<string>();
    let current = activeSlug;
    while (current && !path.has(current)) {
      path.add(current);
      current = bySlug.get(current)?.parentSlug ?? "";
    }
    path.delete(activeSlug);
    return path;
  }, [activeSlug, categories]);
  const [expanded, setExpanded] = useState(
    () => new Set(categories.filter((category) => category.default_expanded && category.slug !== activeSlug).map((category) => category.slug)),
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggle = (slug: string) => {
    const isOpen = !collapsed.has(slug) && (expanded.has(slug) || activePath.has(slug));
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (isOpen && activePath.has(slug)) next.add(slug);
      else next.delete(slug);
      return next;
    });
    setExpanded((previous) => {
      const next = new Set(previous);
      if (isOpen) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };
  const closeDrawer = () => setDrawerOpen(false);
  const total = visibleCategories
    .filter((category) => !category.parentSlug)
    .reduce((sum, category) => sum + category.listingCount, 0);
  return (
    <div className={styles.sidebarSlot}>
      <button
        className={styles.drawerButton}
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={t("open")}
      >
        <Menu size={20} />
        <span>{t("title")}</span>
      </button>
      {drawerOpen ? (
        <button
          className={styles.backdrop}
          type="button"
          onClick={closeDrawer}
          aria-label={t("close")}
        />
      ) : null}
      <aside
        className={`sidebar ${styles.drawer} ${drawerOpen ? styles.open : ""}`}
        aria-label={t("title")}
      >
        <div className="side-head">
          <b>{t("title")}</b>
          <div className={styles.headActions}>
            <small>
              {t("listingCount", { count: formatNumber(total, locale) })}
            </small>
            <button
              className={styles.closeButton}
              type="button"
              onClick={closeDrawer}
              aria-label={t("close")}
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <Link className="all-cats" href={activeRootSlug ? `/search?category=${activeRootSlug}` : "/search"} onClick={closeDrawer}>
          <PlusSquare size={17} /> {t("all")}{" "}
          <small>{formatNumber(total, locale)}</small>
        </Link>
        <ul className={styles.tree}>
          {(tree.get(undefined) ?? []).map((category) => (
            <CategoryBranch
              key={category.slug}
              category={category}
              tree={tree}
              depth={0}
              expanded={expanded}
              collapsed={collapsed}
              onToggle={toggle}
              onNavigate={closeDrawer}
              activeSlug={activeSlug}
              activePath={activePath}
            />
          ))}
        </ul>
        <Link className="side-row recent" href="/search" onClick={closeDrawer}>
          <History size={17} /> {t("recent")} <small>-</small>
        </Link>
      </aside>
    </div>
  );
}
