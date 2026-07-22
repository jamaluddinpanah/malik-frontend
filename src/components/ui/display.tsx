"use client";
/* eslint-disable @next/next/no-img-element -- avatars may be external user-provided images. */

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, ForbiddenState } from "@/components/feedback";
import styles from "./ui.module.css";

export { EmptyState, ErrorState, ForbiddenState };

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
}) {
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      {children}
    </span>
  );
}
export function StatusBadge({
  status,
}: {
  status:
    | "draft"
    | "pending"
    | "published"
    | "paused"
    | "sold"
    | "archived"
    | "rejected";
}) {
  const tone =
    status === "published" || status === "sold"
      ? "success"
      : status === "rejected"
        ? "danger"
        : status === "pending"
          ? "warning"
          : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}
export function Card({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Tag className={`${styles.card} ${className}`}>{children}</Tag>;
}
export function ListingCardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`${styles.listingCard} ${className}`}>
      {children}
    </article>
  );
}
export function Avatar({
  name,
  src,
  size = "md",
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`${styles.avatar} ${styles[`avatar_${size}`]}`}
      aria-label={name}
    >
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: readonly { label: string; href?: string }[];
}) {
  const t = useTranslations("accessibility");
  return (
    <nav className={styles.breadcrumbs} aria-label={t("breadcrumb")}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? (
              <a href={item.href}>{item.label}</a>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
            {index < items.length - 1 ? (
              <ChevronRight
                className={styles.directionalIcon}
                aria-hidden="true"
                size={15}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("accessibility");
  const pages = Array.from(
    { length: Math.min(totalPages, 7) },
    (_, index) => index + 1,
  );
  return (
    <nav className={styles.pagination} aria-label={t("pagination")}>
      <button
        type="button"
        aria-label={t("previousPage")}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className={styles.directionalIcon} />
      </button>
      {pages.map((page) => (
        <button
          type="button"
          key={page}
          aria-current={page === currentPage ? "page" : undefined}
          className={page === currentPage ? styles.currentPage : ""}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        aria-label={t("nextPage")}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className={styles.directionalIcon} />
      </button>
    </nav>
  );
}

export function Skeleton({
  className = "",
  label = "Loading content",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      role="status"
      aria-label={label}
    />
  );
}
export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className={styles.spinner} role="status">
      <LoaderCircle aria-hidden="true" />
      <span className={styles.visuallyHidden}>{label}</span>
    </span>
  );
}
export function Alert({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  return (
    <section
      className={`${styles.alert} ${styles[`alert_${tone}`]}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span>{tone === "success" ? <CheckCircle2 /> : <AlertCircle />}</span>
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </section>
  );
}
export function Toast({
  title,
  message,
  tone = "info",
  onDismiss,
}: {
  title: string;
  message?: string;
  tone?: "info" | "success" | "warning" | "danger";
  onDismiss?: () => void;
}) {
  const t = useTranslations("accessibility");
  return (
    <div className={styles.toastRegion} aria-live="polite">
      <section
        className={`${styles.toastCard} ${styles[`toast_${tone}`]}`}
        role={tone === "danger" ? "alert" : "status"}
      >
        <span className={styles.toastIcon}>
          {tone === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
        </span>
        <div className={styles.toastContent}>
          <b>{title}</b>
          {message ? <p>{message}</p> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            className={styles.toastDismiss}
            onClick={onDismiss}
            aria-label={t("dismissNotification")}
          >
            <X size={18} />
          </button>
        ) : null}
      </section>
    </div>
  );
}

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};
export function DataTable<T extends { id: string | number }>({
  caption,
  columns,
  rows,
  empty,
}: {
  caption: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  empty?: ReactNode;
}) {
  const t = useTranslations("accessibility");
  return (
    <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>{empty ?? t("noResults")}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
