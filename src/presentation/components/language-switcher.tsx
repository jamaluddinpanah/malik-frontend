"use client";

import { Languages } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type AppLocale,
  clientLocale,
  isAppLocale,
  locales,
  switchClientLocale,
} from "@/i18n/config";
import styles from "./language-switcher.module.css";

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("language");
  const pathname = usePathname();
  const localeFromPath = pathname.split("/")[1];
  // The locale in the visible URL wins over the cookie. This avoids a stale
  // cookie briefly rendering "English" inside a Dari or Pashto page.
  const current = isAppLocale(localeFromPath) ? localeFromPath : clientLocale();

  return (
    <label className={`${styles.root} ${className ?? ""}`}>
      <Languages size={17} />
      <select
        suppressHydrationWarning
        aria-label={t("select")}
        value={current}
        onChange={(event) =>
          switchClientLocale(event.target.value as AppLocale)
        }
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {t(locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
