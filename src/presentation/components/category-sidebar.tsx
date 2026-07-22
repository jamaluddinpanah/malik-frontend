"use client";

import { LocalizedLink as Link } from "./localized-link";
import { useMemo, useState } from "react";
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
import type { Category } from "@/domain/listings/entities";
import styles from "./category-sidebar.module.css";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting/locale";
import type { AppLocale } from "@/i18n/config";
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
  onToggle,
  onNavigate,
}: {
  category: Category;
  tree: CategoryTree;
  depth: number;
  expanded: Set<string>;
  onToggle: (slug: string) => void;
  onNavigate: () => void;
}) {
  const t = useTranslations("categories");
  const locale = useLocale() as AppLocale;
  const children = tree.get(category.slug) ?? [];
  const hasChildren = children.length > 0;
  const isOpen = expanded.has(category.slug);
  const Icon = (category.icon && categoryIconMap[category.icon]) || categoryIcons[category.slug] || ShoppingBag;
  const categoryLabel = t.has(`names.${category.slug}`)
    ? t(`names.${category.slug}`)
    : category.name;
  return (
    <li>
      <div
        className={`${styles.row} ${depth === 0 ? styles.root : styles.child}`}
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
          className={`${styles.categoryLink} ${!hasChildren ? styles.leafLink : ""}`}
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
              onToggle={onToggle}
              onNavigate={onNavigate}
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
  const tree = useMemo(
    () =>
      categories.reduce<CategoryTree>((map, category) => {
        const bucket = map.get(category.parentSlug) ?? [];
        bucket.push(category);
        map.set(category.parentSlug, bucket);
        return map;
      }, new Map()),
    [categories],
  );
  const [expanded, setExpanded] = useState(
    () => new Set(categories.filter((category) => category.default_expanded).map((category) => category.slug)),
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toggle = (slug: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const closeDrawer = () => setDrawerOpen(false);
  const total = categories
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
        <Link className="all-cats" href="/search" onClick={closeDrawer}>
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
              onToggle={toggle}
              onNavigate={closeDrawer}
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
