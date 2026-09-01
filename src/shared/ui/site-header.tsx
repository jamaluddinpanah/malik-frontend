"use client";

import Image from "next/image";
import { LocalizedLink as Link } from "./localized-link";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/features/auth/auth-provider";
import styles from "./site-header.module.css";
import { MobilePublicNavigation } from "./mobile-public-navigation";
import { NotificationBell } from "@/features/account/notification-bell";
import { ManagedNavigationLinks } from "@/features/content/managed-navigation-links";

const links = [
  ["account", "/my-account"],
  ["myAds", "/my-account/unpublished"],
  ["myFavorites", "/my-account/favorite-listings"],
  ["messages", "/my-account/messages"],
] as const;

function Brand() {
  const t = useTranslations("navigation");
  return (
    <Link href="/" className="logo">
      <Image className="logoImage" src="/malik-logo.png" alt={t("brandName")} width={54} height={54} priority />
      <strong>
        {t("brandName")}<small>{t("tagline")}</small>
      </strong>
    </Link>
  );
}

function AccountMenu() {
  const { user, logout, isAuthenticating } = useAuth();
  const t = useTranslations("navigation");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  if (!user)
    return (
      <div className={styles.guestLinks}>
        <Link href="/login">{t("signIn")}</Link>
        <Link href="/register">{t("register")}</Link>
      </div>
    );
  return (
    <div ref={menuRef} className={`${styles.menu} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={styles.menuTrigger}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound size={17} /> {t("account")} <ChevronDown size={14} />
      </button>
      <div className="account-dropdown" role="menu">
        <b dir="auto">{user.name}</b>
        {links.map(([name, href]) => (
          <Link href={href} key={href} onClick={() => setOpen(false)}>
            {t(name)}
            <ChevronRight className="directional-icon" size={15} />
          </Link>
        ))}
        <button
          type="button"
          className="signout"
          disabled={isAuthenticating}
          onClick={async () => {
            await logout();
            setOpen(false);
          }}
        >
          <LogOut size={15} />
          {isAuthenticating ? "…" : t("logout")}
        </button>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const { user } = useAuth();
  const t = useTranslations("navigation");
  const shell = useTranslations("publicShell");
  const canAdmin =
    user?.role === "superadmin" || user?.permissions.includes("admin.access");
  return (
    <>
      <div className="topbar">
        <div className="shell">
          <span>
            {user ? (
                <>
                  <Link href="/my-account">{t("account")}</Link>
                  {canAdmin ? <><i /><Link href="/admin">{shell("admin")}</Link></> : null}
                </>
            ) : null}
            {user ? <i /> : null}
            <ManagedNavigationLinks location="header" />
          </span>
          {user ? <span><Link href="/my-account/messages"><MessageSquare size={14} /> {t("messages")}</Link></span> : null}
        </div>
      </div>
      <header>
        <div className="shell header">
          <div className={styles.brandArea}>
            <MobilePublicNavigation />
            <Brand />
          </div>
          <nav className={styles.headerActions} aria-label={t("account")}>
          {user ? <NotificationBell /> : null}<AccountMenu />
            <Link className="post" href="/post-ad">
              {t("postAd")}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
