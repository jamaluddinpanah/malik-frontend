"use client";

import { LocalizedLink as Link } from "./localized-link";
import {
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LogOut,
  MessageSquare,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/presentation/auth/auth-provider";
import styles from "./site-header.module.css";
import { MobilePublicNavigation } from "./mobile-public-navigation";

const links = [
  ["account", "/account"],
  ["myAds", "/my-account/my-ads"],
  ["myFavorites", "/my-account/favorites"],
  ["messages", "/my-account/messages"],
] as const;

function Brand() {
  const t = useTranslations("navigation");
  return (
    <Link href="/" className="logo">
      <b>
        M<span>•</span>
      </b>
      <strong>
        Malik<small>{t("tagline")}</small>
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
                <Link href="/account">{t("account")}</Link>
                <i />
                {canAdmin ? <Link href="/admin">{shell("admin")}</Link> : null}
              </>
            ) : (
              <Link href="/about">{shell("about")}</Link>
            )}
            <i />
            <Link href="/safety">
              <CircleHelp size={14} /> {t("help")}
            </Link>
          </span>
          <span>
            <MessageSquare size={14} /> {t("messages")}
          </span>
        </div>
      </div>
      <header>
        <div className="shell header">
          <div className={styles.brandArea}>
            <MobilePublicNavigation />
            <Brand />
          </div>
          <nav className={styles.headerActions} aria-label={t("account")}>
            <AccountMenu />
            <Link className="post" href="/post-ad">
              {t("postAd")}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
