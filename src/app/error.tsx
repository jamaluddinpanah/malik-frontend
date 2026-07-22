"use client";
import { useTranslations } from "next-intl";
export default function GlobalError() {
  const t = useTranslations("feedback");
  return (
    <main className="page">
      <div className="empty" role="alert">
        {t("errorTitle")}. {t("errorDescription")}
      </div>
    </main>
  );
}
