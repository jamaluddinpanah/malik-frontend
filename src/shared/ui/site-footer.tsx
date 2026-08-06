"use client";

import { CircleHelp, Copyright, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";
import styles from "./site-footer.module.css";
import { FooterCategoryLinks } from "@/features/catalog/footer-category-links";
import { ManagedNavigationLinks } from "@/features/content/managed-navigation-links";

function LanguageSelector() {
  return <LanguageSwitcher className={styles.language} />;
}
function AppleStoreIcon() {
  return (
    <svg
      className={styles.appleStoreIcon}
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M349.13 136.86c-40.32-2.29-75.68 22.86-94.86 22.86-20.3 0-50.28-21.52-83.48-20.84-42.75.69-82.76 25.48-104.76 64.22-45.55 79.1-11.58 195.48 32.1 259.39 21.86 31.32 47.39 66.29 80.84 65.06 32.71-1.36 44.92-20.94 84.4-20.94 38.25 0 49.72 20.94 84.67 20.16 35.12-.58 57.23-31.49 78.33-63.1 25.28-35.93 35.46-71.36 35.86-73.18-.82-.27-68.27-26.12-68.96-102.42-.59-63.82 52.09-94.53 54.45-95.98-29.5-43.16-75.47-47.99-98.54-49.17ZM324.9 95.14c17.59-21.99 29.66-51.89 26.32-82.14-25.45 1.12-57.28 17.61-75.62 39.13-16.23 18.91-30.7 49.94-26.96 79.05 28.62 2.19 58.36-14.58 76.26-36.04Z"
      />
    </svg>
  );
}
function GooglePlayIcon() {
  return (
    <svg
      className={styles.googlePlayIcon}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path fill="#00d6ff" d="M6 4.5 27 24 6 43.5Z" />
      <path fill="#7ce34b" d="m6 4.5 28 16.1-7 3.4Z" />
      <path fill="#ffca28" d="m27 24 7 3.4L6 43.5Z" />
      <path fill="#ff4d5a" d="M34 20.6c4 2.3 4 4.5 0 6.8L27 24Z" />
    </svg>
  );
}
export function SiteFooter() {
  const t = useTranslations("footer");
  if (usePathname().replace(/^\/(en|fa|ps)/, "") === "/post-ad")
    return (
      <footer className={styles.postingFooter}>
        <div className={styles.postingShell}>
          <div className={styles.postingSupport}>
            <div className={styles.supportItem}>
              <b className={styles.supportIcon}>24</b>
              <p>
                <strong>{t("customerService")}</strong>
                <span>0 850 222 44 44</span>
              </p>
            </div>
            <div className={styles.supportItem}>
              <b className={styles.supportIcon}>
                <CircleHelp size={19} />
              </b>
              <p>
                <strong>{t("helpCenter")}</strong>
                <span>help.malik.local</span>
              </p>
            </div>
            <div className={styles.postingLanguage}>
              <b>{t("language")}</b>
              <LanguageSelector />
            </div>
          </div>
          <p className={styles.disclaimer}>{t("listingDisclaimer")}</p>
          <p className={styles.postingCopyright}>{t("postingCopyright")}</p>
        </div>
      </footer>
    );
  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.columns}>
          <div><b>{t("about")}</b><ManagedNavigationLinks location="footer_company" /></div>
          <div><b>{t("categories")}</b><FooterCategoryLinks /></div>
          <div><b>{t("help")}</b><ManagedNavigationLinks location="footer_help" /></div>
          <div className={styles.languageColumn}>
            <b>{t("language")}</b>
            <LanguageSelector />
          </div>
          <div>
            <b>{t("mobileApp")}</b>
            <span className={styles.store}>
              <AppleStoreIcon />
              <span>
                {t("appStore")}
                <br />
                <strong>{t("appStoreName")}</strong>
              </span>
            </span>
            <span className={styles.store}>
              <GooglePlayIcon />
              <span>
                {t("googlePlay")}
                <br />
                <strong>{t("googlePlayName")}</strong>
              </span>
            </span>
          </div>
        </div>
        <div className={styles.bottom}>
          <span className={styles.copyright}>
            <i className={styles.footerBrand}>
              M<small>•</small>
            </i>
            <Copyright size={14} aria-hidden="true" />{" "}
            <span>{t("copyright")}</span>
          </span>
          <span><ManagedNavigationLinks location="footer_legal" prefix={<ShieldCheck size={14} aria-hidden="true" />} /></span>
        </div>
      </div>
    </footer>
  );
}
