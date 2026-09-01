"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bell,
  BriefcaseBusiness,
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
import type { AppLocale } from "@/shared/i18n/config";
import {
  formatCurrency,
  formatNumber,
} from "@/shared/lib/formatting/locale";
import { ProfileSettingsForm } from "@/features/auth/account-settings-forms";
import { AccountContactForm, AccountDeletionForm, AccountSecurityForm, SignedInDevices } from "./account-security-forms";
import { apiClient } from "@/shared/lib/api/api-client";
import { routes } from "@/shared/lib/routes";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import styles from "./account-dashboard.module.css";
import { MessagesPortal } from "@/features/messaging/messages-portal";
import { NotificationsPanel } from "./notifications-panel";
import { BlockedUsersPanel } from "./blocked-users-panel";
import { useAuth } from "@/features/auth/auth-provider";
import { ApplicantManagementDetails, ApplicationProfile, Applications, TeamManagement } from "@/features/jobs/job-applications-and-team-management";
import { ConfirmationDialog } from "@/shared/ui";

const sections = [
  ["overview", []],
  ["listingManagement", ["published", "unpublished"]],
  ["favorites", ["favoriteListings"]],
  ["messaging", ["messages"]],
  ["accountSettings", [
      "personalInformation",
      "emailAddress",
      "mobilePhone",
      "deleteAccount",
      "passwordChange",
      "twoFactor",
      "recoveryEmail",
      "accountVerification",
      "blockedUsers",
      "signedInDevices",
      "notifications",
    ]],
] as const;
const slugByKey: Record<string, string> = {
  overview: "",
  published: "published",
  unpublished: "unpublished",
  favoriteListings: "favorite-listings",
  messages: "messages",
  personalInformation: "my-personal-information",
  emailAddress: "email-address",
  mobilePhone: "mobile-phone-number",
  deleteAccount: "delete-account",
  passwordChange: "password-change",
  twoFactor: "two-factor-authentication",
  recoveryEmail: "account-recovery-email",
  accountVerification: "account-verification",
  blockedUsers: "blocked-users",
  signedInDevices: "signed-in-devices",
  notifications: "notifications",
  team: "team",
   myApplications: "applications",
   applicationProfile: "application-profile",
  applicantManagement: "applicants",
};
const keyBySlug = Object.fromEntries(
  Object.entries(slugByKey).map(([key, slug]) => [slug, key]),
);

type OwnedListing = {
  id: number;
  slug?: string;
  title: string;
  status: string;
  view_count?: number;
  price?: number | null;
  currency?: { code: string } | null;
  city?: string | null;
  district?: string | null;
  media?: { url?: string; path?: string }[];
};

function NavIcon({ name }: { name: string }) {
  const Icon =
    name.includes("application")
      ? BriefcaseBusiness
      : name.includes("listing") || name.includes("published")
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
  title = "Overview",
  basePath = "/my-account",
}: {
  title?: string;
  basePath?: string;
}) {
  const t = useTranslations("accountDashboard");
  const locale = useLocale() as AppLocale;
  const currentSlug = title.toLowerCase().replace(/\s+/g, "-");
  const currentKey = keyBySlug[currentSlug] ?? "overview";
  const { user } = useAuth();
  const canManageTeam = user?.account_type === "business" || user?.account_type === "organization";
  const canManageApplicants = canManageTeam || user?.role === "superadmin" || user?.roles.includes("organization_recruiter") || user?.permissions.includes("job-applications.manage");
  const visibleSections = [
    ...sections,
    ...(canManageTeam ? [["team", []] as const] : []),
    ["jobApplications", ["applicationProfile", "myApplications", ...(canManageApplicants ? ["applicantManagement"] : [])]] as const,
  ];
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
               {visibleSections.map(([heading, items], index) => (
                <div className={index === 0 ? "current" : ""} key={heading}>
                   {slugByKey[heading] !== undefined ? <Link href={slugByKey[heading] ? `${basePath}/${slugByKey[heading]}` : basePath} onClick={close}>
                     {heading !== "overview" ? <NavIcon name={heading} /> : null}
                     {t(`sections.${heading}`)}
                   </Link> : <b>
                     {heading !== "overview" ? <NavIcon name={heading} /> : null}
                     {t(`sections.${heading}`)}
                   </b>}
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
              <Overview locale={locale} />
            ) : currentKey === "team" && canManageTeam ? (
              <TeamManagement />
             ) : currentKey === "myApplications" ? (
               <Applications />
             ) : currentKey === "applicationProfile" ? (
               <ApplicationProfile />
            ) : currentKey === "applicantManagement" && canManageApplicants ? (
              <ApplicantManagementDetails />
              ) : currentKey === "personalInformation" ? (
               <ProfileSettingsForm />
             ) : currentKey === "emailAddress" ? (
               <AccountContactForm kind="email" />
             ) : currentKey === "mobilePhone" ? (
               <AccountContactForm kind="phone" />
             ) : currentKey === "deleteAccount" ? (
               <AccountDeletionForm />
             ) : currentKey === "passwordChange" || currentKey === "twoFactor" || currentKey === "recoveryEmail" || currentKey === "accountVerification" ? (
               <AccountSecurityForm section={currentKey} />
             ) : currentKey === "signedInDevices" ? (
               <SignedInDevices />
            ) : currentKey === "favoriteListings" ? (
              <Favorites />
            ) : currentKey === "messages" ? (
              <MessagesPortal />
            ) : currentKey === "notifications" ? (
              <NotificationsPanel />
            ) : currentKey === "blockedUsers" ? (
              <BlockedUsersPanel />
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
  const [listingToDelete, setListingToDelete] = useState<OwnedListing | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      await apiClient.csrfCookie();
      await apiClient.request(url, {
        method: "POST",
      });
      await load();
    } catch {
      setMessage(t("actionError"));
    }
  }

  async function remove() {
    if (!listingToDelete || deleting) return;
    setDeleting(true);
    setMessage(null);
    try {
      await apiClient.csrfCookie();
      await apiClient.request(routes.api.listing(listingToDelete.id), { method: "DELETE" });
      setListingToDelete(null);
      await load();
    } catch {
      setMessage(t("actionError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="settings-panel">
      <ConfirmationDialog
        open={Boolean(listingToDelete)}
        onClose={() => !deleting && setListingToDelete(null)}
        title={t("deleteListingTitle")}
        cancelLabel={t("cancel")}
        confirmLabel={deleting ? t("deleting") : t("actions.delete")}
        onConfirm={() => void remove()}
        className={styles.deleteDialog}
      >
        <p>{t("confirmDelete", { listing: listingToDelete?.title ?? "" })}</p>
      </ConfirmationDialog>
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
          <div className="listing-empty">
            <span className="listing-empty-icon"><ClipboardList size={22} /></span>
            <b>{t("emptyTitle", { section: t(`sections.${status}`) })}</b>
            <small>{t("emptyDescription")}</small>
            <Link href="/post-ad">{t("postAction")}</Link>
          </div>
        </div>
      ) : (
        <div className="status-rows">
          {listings.map((listing) => (
            <article key={listing.id} className="account-listing-row">
              {listing.media?.[0]?.url ? <img src={listing.media[0].url} alt="" /> : <span className="listing-image-placeholder"><ClipboardList size={20} /></span>}
              <span>
                <b dir="auto">{listing.title}</b>
                {listing.price != null ? (
                  <small>{formatCurrency(listing.price, listing.currency?.code ?? "AFN", locale)}</small>
                ) : null}
                 <small className="listing-status">{listing.status.replaceAll("_", " ")}</small>
                 <small>{t("views", { count: formatNumber(listing.view_count ?? 0, locale) })}</small>
              </span>
              <div className="listing-actions">
                {listing.status !== "sold" ? (
                  <Link href={`/post-ad?listing=${listing.id}`}>{t("actions.edit")}</Link>
                ) : null}
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
                {status === "unpublished" ? (
                  <button type="button" onClick={() => setListingToDelete(listing)}>
                    {t("actions.delete")}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Favorites() {
  const t = useTranslations("accountDashboard");
  const locale = useLocale() as AppLocale;
  const [items, setItems] = useState<Array<{ id: number; slug: string; title: string; price?: number | null; currency?: { code: string } | null; media?: Array<{ url?: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    void apiClient.request<{ data: { data: typeof items } }>(routes.api.myFavorites).then((response) => setItems(response.data.data)).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);
  if (loading) return <section className="settings-panel"><p role="status">{t("loading")}</p></section>;
  async function remove(id: number) {
    setRemoving(id); setError(false);
    try { await apiClient.csrfCookie(); await apiClient.request(routes.api.listingFavorite(id), { method: "DELETE" }); setItems((current) => current.filter((item) => item.id !== id)); } catch { setError(true); } finally { setRemoving(null); }
  }
  return <section className="settings-panel"><header><div><h1>{t("sections.favoriteListings")}</h1><p>{t("favoriteDescription")}</p></div><Link href="/my-account">{t("back")}</Link></header>{error ? <p role="alert">{t("actionError")}</p> : null}<div className="status-rows">{items.length ? items.map((item) => <article className="account-listing-row" key={item.id}>{item.media?.[0]?.url ? <img src={item.media[0].url} alt="" /> : null}<span><Link href={`/listing/${item.slug}`}><b>{item.title}</b></Link>{item.price != null ? <small>{formatCurrency(item.price, item.currency?.code ?? "AFN", locale)}</small> : null}</span><button type="button" className="favorite-remove" disabled={removing === item.id} onClick={() => void remove(item.id)}>{removing === item.id ? t("saving") : t("removeFavorite")}</button></article>) : <div className="listing-empty"><b>{t("emptyTitle", { section: t("sections.favoriteListings") })}</b><small>{t("emptyDescription")}</small></div>}</div></section>;
}

function Overview({ locale }: { locale: AppLocale }) {
  const t = useTranslations("accountDashboard");
  const [recentListings, setRecentListings] = useState<OwnedListing[]>([]);
  const [summary, setSummary] = useState({ active_ads: 0, favorites: 0, received_messages: 0 });
  useEffect(() => {
    void apiClient.request<{ data: { data: OwnedListing[] } }>(routes.api.myListings)
      // This section links to public listing pages, which are only available after publication.
      .then((response) => setRecentListings(response.data.data.filter((listing) => listing.status === "published").slice(0, 3)))
      .catch(() => setRecentListings([]));
    void apiClient.request<{ data: typeof summary }>(routes.api.myDashboard)
      .then((response) => setSummary(response.data))
      .catch(() => setSummary({ active_ads: 0, favorites: 0, received_messages: 0 }));
  }, []);
  return (
    <>
      <div className="account-stats">
        <article>
          <ClipboardList />
          <span>{t("activeAds")}</span>
          <b>{formatNumber(summary.active_ads, locale)}</b>
        </article>
        <article>
          <Heart />
          <span>{t("favoriteCount")}</span>
          <b>{formatNumber(summary.favorites, locale)}</b>
        </article>
        <article>
          <Mail />
          <span>{t("messageCount")}</span>
          <b>{formatNumber(summary.received_messages, locale)}</b>
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
        <Link href="/my-account/favorite-listings">
        <article>
          <b>
            <Heart size={18} />
            {t("favoriteAds")}
          </b>
          <p>{t("favoriteDescription")}</p>
          <small>{formatNumber(summary.favorites, locale)} {t("favoriteCount")}</small>
        </article>
        </Link>
      </div>
      <section className="activity">
        <h2>
          {t("recentActivity")}
          <Link href="/my-account/published">{t("viewAll")}</Link>
        </h2>
        {recentListings.map((listing) => (
          <Link
            className="activity-row"
            href={listing.slug ? `/listing/${listing.slug}` : "/my-account/unpublished"}
            key={listing.id}
          >
            {listing.media?.[0]?.url ? <img src={listing.media[0].url} alt="" /> : <span />}
            <b dir="auto">{listing.title}</b>
            <span>
               {listing.price != null ? formatCurrency(listing.price, listing.currency?.code ?? "AFN", locale) : "-"}
            </span>
            <span dir="auto">
              <bdi>{listing.city ?? ""}</bdi>
            </span>
            <span>{listing.status}</span>
          </Link>
        ))}
      </section>
    </>
  );
}
