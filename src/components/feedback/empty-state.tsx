"use client";

import { useTranslations } from "next-intl";
import styles from "./feedback.module.css";

export function EmptyState({ title, description }: { title?: string; description?: string }) {
  const t = useTranslations("feedback");
  return <section className={styles.state}><h2>{title ?? t("emptyTitle")}</h2><p>{description ?? t("emptyDescription")}</p></section>;
}
