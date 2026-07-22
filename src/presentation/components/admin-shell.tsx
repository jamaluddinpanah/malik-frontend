"use client";

import { LocalizedLink as Link } from "./localized-link";
import {
  ChevronDown,
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  Languages,
  LogOut,
  MapPinned,
  Menu,
  ShieldCheck,
  Settings,
  Tags,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/presentation/auth/auth-provider";
import { withActiveLocale } from "./localized-link";
import {
  clientLocale,
  locales,
  switchClientLocale,
  type AppLocale,
} from "@/i18n/config";
import styles from "./admin-shell.module.css";
import { adminPermissions } from "@/domain/auth/permissions";

const navigation = [
  ["dashboard", "/admin", LayoutDashboard, [adminPermissions.analytics]],
  ["users", "/admin/users", Users, [adminPermissions.users]],
  ["roles", "/admin/roles", UserCog, [adminPermissions.roles]],
  [
    "permissions",
    "/admin/permissions",
    ShieldCheck,
    [adminPermissions.permissions],
  ],
  [
    "locations",
    "/admin/locations",
    MapPinned,
    [adminPermissions.settingsManage],
  ],
  [
    "currencies",
    "/admin/currencies",
    Landmark,
    [adminPermissions.currencies],
  ],
  [
    "exchangeRates",
    "/admin/exchange-rates",
    ArrowLeftRight,
    [adminPermissions.currencies],
  ],
  [
    "settings",
    "/admin/settings",
    Settings,
    [adminPermissions.settings],
  ],
  ["catalog", "/admin/catalog", Tags, [adminPermissions.categories]],
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("admin");
  const roleT = useTranslations("roles");
  const roleLabel = (role: string) =>
    roleT.has(role) ? roleT(role) : role.replaceAll("_", " ");
  const { user, logout, isAuthenticating, canAll } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const routePath = pathname.replace(/^\/(en|fa|ps)(?=\/|$)/, "") || "/";
  const activeLocale =
    (pathname.match(/^\/(en|fa|ps)(?=\/|$)/)?.[1] as AppLocale | undefined) ??
    clientLocale();
  const active =
    navigation.find(
      ([, href]) => href !== "/admin" && routePath.startsWith(href),
    ) ?? navigation[0];
  const visibleNavigation = navigation.filter(([, , , permissions]) =>
    canAll([...permissions]),
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCollapsed(
        window.localStorage.getItem("malik-admin-sidebar-collapsed") === "true",
      );
      setSidebarPreferenceLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    window.localStorage.setItem(
      "malik-admin-sidebar-collapsed",
      String(collapsed),
    );
  }, [collapsed, sidebarPreferenceLoaded]);

  useEffect(() => {
    const closeProfileMenu = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    };

    document.addEventListener("pointerdown", closeProfileMenu);
    return () => document.removeEventListener("pointerdown", closeProfileMenu);
  }, []);
  const toggleSidebar = () => {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setOpen(true);
      return;
    }

    setTransitioning(true);
    setCollapsed((value) => !value);
    window.setTimeout(() => setTransitioning(false), 210);
  };
  const languageT = useTranslations("language");

  return (
    <main
      className={`${styles.scope} ${collapsed ? styles.collapsed : ""} ${transitioning ? styles.transitioning : ""}`}
    >
      {open && (
        <button
          className={styles.backdrop}
          aria-label={t("closeMenu")}
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        <div className={styles.brand}>
          <ShieldCheck />
          <span>{t("brand")}</span>
          <button
            className={styles.mobileClose}
            aria-label={t("closeMenu")}
            onClick={() => setOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        <nav>
          {visibleNavigation.map(([label, href, Icon]) => (
            <Link
              className={routePath === href ? styles.active : ""}
              href={href}
              key={href}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{t(label)}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <section className={styles.content}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenu}
            onClick={toggleSidebar}
            aria-label={collapsed ? t("expandSidebar") : t("toggleSidebar")}
          >
            <Menu size={20} />
          </button>
            <div className={styles.crumbs}>
              <Link href="/admin">{t("brand")}</Link>
              <span>/</span>
              {(() => {
                const ActiveIcon = active[2];
                return <ActiveIcon className={styles.crumbIcon} size={17} aria-hidden="true" />;
              })()}
              <b>{t(active[0])}</b>
          </div>
          <label className={styles.language} title={languageT("select")}>
            <Languages size={17} aria-hidden="true" />
            <select
              aria-label={languageT("select")}
              value={activeLocale}
              onChange={(event) =>
                switchClientLocale(event.target.value as AppLocale)
              }
            >
              {locales.map((locale) => (
                <option key={locale} value={locale}>
                  {languageT(locale)}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.profile} ref={profileRef}>
            <button
              className={styles.profileTrigger}
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen((value) => !value)}
            >
              <span>{user?.name}</span>
              <ChevronDown size={15} />
            </button>
            {profileOpen && (
              <div className={styles.profileMenu}>
                <strong>{user?.name}</strong>
                <small>
                  {user?.roles.map(roleLabel).join(", ") ||
                    (user?.role ? roleLabel(user.role) : "")}
                </small>
                <button
                  className={styles.logout}
                  disabled={isAuthenticating}
                  onClick={async () => {
                    setProfileOpen(false);
                    await logout();
                    router.replace(
                      withActiveLocale("/login", pathname) as string,
                    );
                  }}
                >
                  <LogOut size={15} />
                  {t("logout")}
                </button>
              </div>
            )}
          </div>
        </header>
        <div className={styles.body}>{children}</div>
      </section>
    </main>
  );
}
