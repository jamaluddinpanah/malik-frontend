"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Drawer } from "@/shared/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { LocalizedLink } from "./localized-link";
import styles from "./site-header.module.css";
import { ManagedNavigationLinks } from "@/features/content/managed-navigation-links";

export function MobilePublicNavigation() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const close = () => setOpen(false);
  const t = useTranslations("publicShell");
  const canAdmin = user?.role === "superadmin" || user?.permissions.includes("admin.access");
  return <><button type="button" className={styles.mobileMenuButton} aria-label={t("openNavigation")} onClick={() => setOpen(true)}><Menu size={22}/></button><Drawer open={open} onClose={close} title={t("mobileNavigation")} side="start"><nav className={styles.mobileNavigation} aria-label={t("mobileNavigation")}><LocalizedLink href="/" onClick={close}>{t("home")}</LocalizedLink><ManagedNavigationLinks location="mobile" onNavigate={close} />{user ? <><LocalizedLink href="/my-account" onClick={close}>{t("account")}</LocalizedLink>{canAdmin ? <LocalizedLink href="/admin" onClick={close}>{t("admin")}</LocalizedLink> : null}</> : <><LocalizedLink href="/login" onClick={close}>{t("login")}</LocalizedLink><LocalizedLink href="/register" onClick={close}>{t("register")}</LocalizedLink></>}</nav></Drawer></>;
}
