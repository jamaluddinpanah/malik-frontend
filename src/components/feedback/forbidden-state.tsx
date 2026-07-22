"use client";

import { useTranslations } from "next-intl";
import styles from "./feedback.module.css";

export function ForbiddenState({ title, description }: { title?: string; description?: string }) {
  const t = useTranslations("feedback");
  return <section className={styles.state} aria-labelledby="forbidden-title"><h2 id="forbidden-title">{title ?? t("forbiddenTitle")}</h2><p>{description ?? t("forbiddenDescription")}</p></section>;
}
