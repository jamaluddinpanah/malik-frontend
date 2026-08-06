"use client";

import { useTranslations } from "next-intl";
import styles from "./feedback.module.css";

export function ErrorState({ title, description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  const t = useTranslations("feedback");
  return <section className={styles.state} role="alert"><h2>{title ?? t("errorTitle")}</h2><p>{description ?? t("errorDescription")}</p>{onRetry ? <button type="button" onClick={onRetry}>{t("retry")}</button> : null}</section>;
}
