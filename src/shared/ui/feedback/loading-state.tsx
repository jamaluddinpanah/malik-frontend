"use client";

import { useTranslations } from "next-intl";
import styles from "./feedback.module.css";

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslations("feedback");
  return <div className={styles.state} role="status" aria-live="polite"><span className={styles.spinner} aria-hidden="true" /><span>{label ?? t("loading")}</span></div>;
}
