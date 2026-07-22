"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  Car,
  ClipboardList,
  Heart,
  KeyRound,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import type { AppLocale } from "@/i18n/config";
import type { Listing } from "@/domain/listings/entities";
import {
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/formatting/locale";
import { PreferredLanguageSelector } from "@/presentation/auth/preferred-language-selector";
import { apiClient } from "@/lib/api/api-client";
import { routes } from "@/lib/routes";
import { LocalizedLink as Link } from "./localized-link";
import styles from "./account-dashboard.module.css";

const sections = [
  ["overview", []],
  ["listingManagement", ["published", "unpublished"]],
  ["favorites", ["favoriteListings", "favoriteSearches", "favoriteSellers"]],
  ["messaging", ["messages", "questions", "offers", "vehicleInspection"]],
  [
    "accountSettings",
    [
      "accountInformation",
      "personalInformation",
      "emailAddress",
      "mobilePhone",
      "deleteAccount",
      "accountSecurity",
      "passwordChange",
      "twoFactor",
      "recoveryEmail",
      "accountVerification",
      "blockedUsers",
      "signedInDevices",
      "appSettings",
      "notificationSettings",
      "readReceipts",
      "messagePermission",
    ],
  ],
] as const;
const slugByKey: Record<string, string> = {
  published: "published",
  unpublished: "unpublished",
  favoriteListings: "favorite-listings",
  favoriteSearches: "favorite-searches",
  favoriteSellers: "favorite-sellers",
  messages: "messages",
  questions: "questions-and-answers",
  offers: "offers",
  vehicleInspection: "vehicle-inspection",
  accountInformation: "account-information",
  personalInformation: "my-personal-information",
  emailAddress: "email-address",
  mobilePhone: "mobile-phone-number",
  deleteAccount: "delete-account",
  accountSecurity: "account-security",
  passwordChange: "password-change",
  twoFactor: "two-factor-authentication",
  recoveryEmail: "account-recovery-email",
  accountVerification: "account-verification",
  blockedUsers: "blocked-users",
  signedInDevices: "signed-in-devices",
  appSettings: "app-settings",
  notificationSettings: "notification-settings",
  readReceipts: "message-read-receipts",
  messagePermission: "electronic-message-permission",
};
const keyBySlug = Object.fromEntries(
  Object.entries(slugByKey).map(([key, slug]) => [slug, key]),
);

type OwnedListing = {
  id: number;
  title: string;
  status: string;
  price?: number | null;
  currency?: string | null;
  media?: { url?: string; path?: string }[];
};

function NavIcon({ name }: { name: string }) {
  const Icon =
    name.includes("listing") || name.includes("published")
      ? ClipboardList
      : name.includes("favorite")
        ? Heart
        : name.includes("message") || name === "offers"
          ? MessageSquare
          : name.includes("search")
            ? Search
            : name.includes("phone")
              ? Phone
              : name.includes("email")
                ? Mail
                : name.includes("security") ||
                    name.includes("password") ||
                    name.includes("factor")
                  ? ShieldCheck
                  : name.includes("delete")
                    ? Trash2
                    : name.includes("vehicle")
                      ? Car
                      : name.includes("notification")
                        ? Bell
                        : name.includes("account") || name.includes("personal")
                          ? UserRound
                          : name.includes("users") || name.includes("devices")
                            ? Users
                            : name.includes("settings")
                              ? Settings
                              : KeyRound;
  return <Icon size={14} />;
}

export function AccountDashboard({
  listings,
  title = "Overview",
  basePath = "/my-account",
}: {
  listings: Listing[];
  title?: string;
  basePath?: string;
}) {
  const t = useTranslations("accountDashboard");
  const locale = useLocale() as AppLocale;
  const currentSlug = title.toLowerCase().replace(/\s+/g, "-");
  const currentKey = keyBySlug[currentSlug] ?? "overview";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);
  return (
    <main className={styles.scope}>
      <div className="account-page">
        <div className="account-shell">
          <div className="account-sidebar-slot">
            <button
              type="button"
              className="account-sidebar-trigger"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={19} />
              {t("menu")}
            </button>
            {sidebarOpen ? (
              <button
                className="account-sidebar-backdrop"
                type="button"
                onClick={close}
                aria-label={t("closeMenu")}
              />
            ) : null}
            <aside
              className={`account-sidebar account-drawer ${sidebarOpen ? "open" : ""}`}
              aria-label={t("menu")}
            >
              <div className="account-drawer-head">
                <b>{t("menu")}</b>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("closeMenu")}
                >
                  <X size={18} />
                </button>
              </div>
              {sections.map(([heading, items], index) => (
                <div className={index === 0 ? "current" : ""} key={heading}>
                  <b>
                    {heading !== "overview" ? <NavIcon name={heading} /> : null}
                    {t(`sections.${heading}`)}
                  </b>
                  {items.map((item) => (
                    <Link
                      className={item === currentKey ? "selected" : ""}
                      href={`${basePath}/${slugByKey[item]}`}
                      key={item}
                      onClick={close}
                    >
                      <NavIcon name={item} />
                      {t(`sections.${item}`)}
                    </Link>
                  ))}
                </div>
              ))}
            </aside>
          </div>
          <section className="account-content">
            {currentKey === "overview" ? (
              <Overview listings={listings} locale={locale} />
            ) : currentKey === "appSettings" ? (
              <PreferredLanguageSelector />
            ) : currentKey === "published" || currentKey === "unpublished" ? (
              <ListingManagement status={currentKey} />
            ) : (
              <section className="settings-panel">
                <header>
                  <div>
                    <h1>{t(`sections.${currentKey}`)}</h1>
                    <p>
                      {t("sectionDescription", {
                        section: t(`sections.${currentKey}`),
                      })}
                    </p>
                  </div>
                  <Link href={basePath}>{t("back")}</Link>
                </header>
                <div className="status-rows">
                  <div>
                    <span>
                      <b>
                        {t("emptyTitle", {
                          section: t(`sections.${currentKey}`),
                        })}
                      </b>
                      <small>{t("emptyDescription")}</small>
                    </span>
                  </div>
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ListingManagement({ status }: { status: "published" | "unpublished" }) {
  const t = useTranslations("accountDashboard");
  const locale = useLocale() as AppLocale;
  const [listings, setListings] = useState<OwnedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await apiClient.request<{
        data: { data: OwnedListing[] };
      }>(routes.api.myListings);
      setListings(
        response.data.data.filter((listing) =>
          status === "published"
            ? listing.status === "published"
            : listing.status !== "published",
        ),
      );
    } catch {
      setMessage(t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // `load` is intentionally recreated with the current view state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function transition(url: string) {
    setMessage(null);
    try {
      await apiClient.request(url, {
        method: "POST",
      });
      await load();
    } catch {
      setMessage(t("actionError"));
    }
  }

  return (
    <section className="settings-panel">
      <header>
        <div>
          <h1>{t(`sections.${status}`)}</h1>
          <p>{t("sectionDescription", { section: t(`sections.${status}`) })}</p>
        </div>
        <Link href="/my-account">{t("back")}</Link>
      </header>
      {message ? <p role="alert">{message}</p> : null}
      {loading ? <p role="status">{t("loading")}</p> : null}
      {!loading && listings.length === 0 ? (
        <div className="status-rows">
          <b>{t("emptyTitle", { section: t(`sections.${status}`) })}</b>
          <small>{t("emptyDescription")}</small>
        </div>
      ) : (
        <div className="status-rows">
          {listings.map((listing) => (
            <article key={listing.id} className="account-listing-row">
              {listing.media?.[0]?.url ? <img src={listing.media[0].url} alt="" /> : null}
              <span>
                <b dir="auto">{listing.title}</b>
                {listing.price != null ? (
                  <small>{formatCurrency(listing.price, listing.currency ?? "AFN", locale)}</small>
                ) : null}
              </span>
              <div className="listing-actions">
                {listing.status === "published" ? (
                  <button type="button" onClick={() => void transition(routes.api.listingPause(listing.id))}>
                    {t("actions.pause")}
                  </button>
                ) : listing.status === "paused" ? (
                  <button type="button" onClick={() => void transition(routes.api.listingResume(listing.id))}>
                    {t("actions.resume")}
                  </button>
                ) : null}
                {listing.status === "published" || listing.status === "paused" ? (
                  <button type="button" onClick={() => void transition(routes.api.listingSold(listing.id))}>
                    {t("actions.sold")}
                  </button>
                ) : null}
                {listing.status !== "archived" ? (
                  <button type="button" onClick={() => void transition(routes.api.listingArchive(listing.id))}>
                    {t("actions.archive")}
                  </button>
                ) : (
                  <button type="button" onClick={() => void transition(routes.api.listingRestore(listing.id))}>
                    {t("actions.restore")}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Overview({
  listings,
  locale,
}: {
  listings: Listing[];
  locale: AppLocale;
}) {
  const t = useTranslations("accountDashboard");
  return (
    <>
      <div className="account-stats">
        <article>
          <ClipboardList />
          <span>{t("activeAds")}</span>
          <b>{formatNumber(0, locale)}</b>
        </article>
        <article>
          <Heart />
          <span>{t("favoriteCount")}</span>
          <b>{formatNumber(0, locale)}</b>
        </article>
        <article>
          <Mail />
          <span>{t("messageCount")}</span>
          <b>{formatNumber(0, locale)}</b>
        </article>
      </div>
      <div className="post-now">
        <b>
          <ClipboardList size={23} />
          {t("postNow")}
        </b>
        <p>{t("postDescription")}</p>
        <Link href="/post-ad">{t("postAction")}</Link>
      </div>
      <div className="account-cards">
        <article>
          <b>
            <Heart size={18} />
            {t("favoriteAds")}
          </b>
          <p>{t("favoriteDescription")}</p>
        </article>
        <article>
          <b>
            <Search size={18} />
            {t("favoriteSearches")}
          </b>
          <p>{t("searchDescription")}</p>
        </article>
      </div>
      <section className="activity">
        <h2>
          {t("recentActivity")}
          <Link href="/my-account/published">{t("viewAll")}</Link>
        </h2>
        {listings.slice(0, 3).map((listing) => (
          <Link
            className="activity-row"
            href={`/listing/${listing.slug}`}
            key={listing.id}
          >
            <img src={listing.images[0]?.url} alt="" />
            <b dir="auto">{listing.title}</b>
            <span>
              {formatCurrency(listing.price, listing.currency, locale)}
            </span>
            <span dir="auto">
              <bdi>{listing.city}</bdi>
            </span>
            <span>{formatRelativeTime(-2, "hour", locale)}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
