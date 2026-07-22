"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export function AdminPlaceholder({
  titleKey,
  detailKey,
}: {
  titleKey: "users" | "roles" | "permissions" | "settings";
  detailKey:
    | "usersDetail"
    | "rolesDetail"
    | "permissionsDetail"
    | "settingsDetail";
}) {
  const t = useTranslations("admin");
  const formT = useTranslations("adminForm");
  return (
    <section className="admin-placeholder">
      <ShieldAlert size={28} />
      <h1>{t(titleKey)}</h1>
      <p>{t(detailKey)}</p>
      <span>{formT("ready")}</span>
    </section>
  );
}
