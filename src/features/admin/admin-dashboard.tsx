"use client";

import { ApiError } from "@/shared/lib/api/legacy-api-client";
import {
  AdminRepository,
  type AdminDashboardData,
} from "@/features/admin/admin-repository";
import {
  Building2,
  LoaderCircle,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./admin-dashboard.module.css";
import { ForbiddenState } from "@/shared/ui/feedback";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { adminPermissions } from "@/features/auth/permissions";

const adminRepository = new AdminRepository();

const cards = [
  ["totalUsers", "total_users", Users],
  ["customers", "total_customers", UserRound],
  ["sellers", "total_sellers", Store],
  ["individualSellers", "individual_sellers", UserRound],
  ["businessSellers", "business_sellers", Building2],
  ["totalListings", "total_listings", Store],
  ["pendingModeration", "pending_moderation", ClipboardCheck],
  ["publishedListings", "published_listings", Store],
] as const;

export function AdminDashboard() {
  const t = useTranslations("admin");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    void adminRepository
      .dashboard()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  if (loading)
    return (
      <div className={styles.state}>
        <LoaderCircle className={styles.spin} /> {t("loading")}
      </div>
    );
  if (error instanceof ApiError && error.status === 403)
    return <ForbiddenState />;
  if (error)
    return (
      <div className={styles.state}>
        <p>
          {error instanceof ApiError
            ? error.message
            : "Unable to load dashboard data."}
        </p>
        <button onClick={load}>{t("retry")}</button>
      </div>
    );
  if (!data) return null;

  return (
    <AdminPageGuard permission={adminPermissions.analytics}>
      <div className={styles.dashboard}>
        <div className={styles.heading}>
          <div>
            <p>{t("overview")}</p>
            <h1>{t("administrationDashboard")}</h1>
          </div>
          <ShieldCheck size={32} />
        </div>
        <section className={styles.cards}>
          {cards.map(([label, field, Icon]) => (
            <article key={field}>
              <Icon />
              <span>{t(label)}</span>
              <b>{data[field]}</b>
            </article>
          ))}
        </section>
        <section className={styles.recent}>
          <h2>{t("recentRegistrations")}</h2>
          {data.recent_registrations.length === 0 ? (
            <p>{t("noRegistrations")}</p>
          ) : (
            <ul>
              {data.recent_registrations.map((user) => (
                <li key={user.id}>
                  <span>
                    <b>{user.name}</b>
                    <small>{user.email}</small>
                  </span>
                  <em>{user.account_type}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminPageGuard>
  );
}
