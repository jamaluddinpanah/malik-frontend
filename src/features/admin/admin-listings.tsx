"use client";
/* eslint-disable @next/next/no-img-element -- Listing media may use user-provided hosts that cannot be statically allowlisted. */

import { useEffect, useEffectEvent, useState } from "react";
import { ClipboardList, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { ApiError } from "@/shared/lib/api";
import { Dialog, RichText } from "@/shared/ui";
import { adminPermissions } from "@/features/auth/permissions";
import { AdminPageGuard } from "@/features/auth/admin-page-guard";
import { useAuth } from "@/features/auth/auth-provider";
import { ForbiddenState } from "@/shared/ui/feedback";
import {
  AdminRepository,
  type AdminListing,
  type AdminListingQuery,
  type AdminModerationDetail,
  type CursorPage,
} from "@/features/admin/admin-repository";
import { VehicleBodyConditionMap } from "@/features/catalog/vehicle-body-condition-map";
import styles from "./admin-listings.module.css";

const repository = new AdminRepository();
const locales = ["en", "fa", "ps"] as const;

function message(error: unknown, fallback: string) {
  return error instanceof ApiError
    ? Object.values(error.errors).flat()[0] ?? error.message
    : fallback;
}

function attributeValue(item: NonNullable<AdminModerationDetail["values"]>[number]) {
  return item.string_value ?? item.text_value ?? item.integer_value ?? item.decimal_value ?? item.boolean_value ?? (item.json_value ? JSON.stringify(item.json_value) : "-");
}

function displayValue(value: string | number | boolean | null | undefined) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function vehicleCondition(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).flatMap(([part, condition]) =>
      typeof condition === "string" ? [[part, condition]] : [],
    ),
  ) as Record<string, string>;
}

export function AdminListings() {
  const t = useTranslations("adminListings");
  const { can } = useAuth();
  const canFeature = can(adminPermissions.listingsFeature);
  const [page, setPage] = useState<CursorPage<AdminListing> | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState<AdminListingQuery>({});
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<AdminListing | null>(null);
  const [detail, setDetail] = useState<AdminModerationDetail | null>(null);
  const [detailError, setDetailError] = useState<unknown>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await repository.adminListings(applied);
      setPage(response.data);
      setTotal(response.meta.total);
    } catch (failure) {
      setError(failure);
    } finally {
      setLoading(false);
    }
  }
  const loadEvent = useEffectEvent(load);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadEvent(), 0);
    return () => window.clearTimeout(timer);
  }, [applied]);

  async function showDetails(listing: AdminListing) {
    setSelected(listing);
    setDetail(null);
    setDetailError(null);
    try {
      setDetail(await repository.adminListing(listing.id));
    } catch (failure) {
      setDetailError(failure);
    }
  }

  function closeDetails() {
    setSelected(null);
    setDetail(null);
    setDetailError(null);
  }

  return (
    <AdminPageGuard permission={adminPermissions.listingsViewAll}>
      <section className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heading}>
            <span className={styles.icon}><ClipboardList size={20} /></span>
            <div><small>{t("sectionLabel")}</small><h1>{t("title")}</h1><p>{t("description")}</p></div>
          </div>
        </header>
        <form className={styles.toolbar} onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setApplied({ q: query, status: status || undefined, cursor: null });
        }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label={t("status")}>
            <option value="">{t("allStatuses")}</option>
            {(["draft", "pending", "published", "paused", "sold", "rejected", "archived"] as const).map((item) => <option key={item} value={item}>{t(item)}</option>)}
          </select>
          <button type="submit">{t("searchAction")}</button>
        </form>
        {loading ? <div className={styles.state}>{t("loading")}</div> : error instanceof ApiError && error.status === 403 ? <ForbiddenState /> : error ? <div className={`${styles.state} ${styles.error}`}><p>{message(error, t("loadError"))}</p><button type="button" onClick={() => void load()}>{t("retry")}</button></div> : !page?.data.length ? <div className={styles.state}>{t("empty")}</div> : <>
          <div className={styles.table}>
            <table>
              <thead><tr><th>Count</th><th>{t("listing")}</th><th>{t("seller")}</th><th>{t("category")}</th><th>{t("status")}</th><th>{t("featured")}</th><th>{t("created")}</th><th>{t("actions")}</th></tr></thead>
              <tbody>{page.data.map((listing, index) => <tr key={listing.id}>
                <td>{offset + index + 1}</td>
                <td><div className={styles.listingCell}>{listing.media?.[0]?.thumbnail_url || listing.media?.[0]?.url ? <img src={listing.media[0].thumbnail_url ?? listing.media[0].url} alt="" /> : <span className={styles.imagePlaceholder} aria-hidden="true" />}<span className={styles.listingInfo}><b>{listing.title}</b><small>{listing.listing_number}</small></span></div></td>
                <td>{listing.owner?.name ?? "-"}</td><td>{listing.category?.slug ?? "-"}</td>
                <td><span className={`${styles.status} ${styles[`status${listing.status}`]}`}>{listing.status}</span></td>
                <td>{canFeature ? <button type="button" onClick={async () => { try { const featured = await repository.featureListing(listing.id, !listing.is_featured); setPage((current) => current ? { ...current, data: current.data.map((item) => item.id === listing.id ? { ...item, is_featured: featured } : item) } : current); } catch (failure) { setError(failure); } }}>{listing.is_featured ? t("unfeature") : t("feature")}</button> : listing.is_featured ? t("yes") : t("no")}</td>
                <td>{new Date(listing.created_at).toLocaleDateString()}</td>
                <td><button className={styles.detailsButton} type="button" onClick={() => void showDetails(listing)}><Eye size={15} /> {t("viewDetails")}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label={t("pagination")}><span>{total} items</span><button type="button" disabled={!page.prev_cursor} onClick={() => { setOffset((value) => Math.max(0, value - 10)); setApplied((current) => ({ ...current, cursor: page.prev_cursor })); }}>{t("previous")}</button><button type="button" disabled={!page.next_cursor} onClick={() => { setOffset((value) => value + page.data.length); setApplied((current) => ({ ...current, cursor: page.next_cursor })); }}>{t("next")}</button></nav>
        </>}
      </section>
      <Dialog open={Boolean(selected)} onClose={closeDetails} title={selected?.title ?? t("viewDetails")} className={styles.detailsDialog}>
        {!detail && !detailError ? <p>{t("loadingDetails")}</p> : detailError ? <p className={styles.error}>{message(detailError, t("loadDetailsError"))}</p> : detail ? <div className={styles.detailContent}>
          <section className={styles.detailSection}><h3>{t("listingDetails")}</h3><div className={styles.detailGrid}><div><strong>{t("seller")}</strong><span>{displayValue(detail.owner?.name)}</span></div><div><strong>{t("category")}</strong><span>{displayValue(detail.category?.slug)}</span></div><div><strong>{t("status")}</strong><span>{displayValue(detail.status)}</span></div><div><strong>{t("condition")}</strong><span>{displayValue(detail.condition)}</span></div></div></section>
          <section className={styles.detailSection}><h3>{t("submittedTranslations")}</h3><div className={styles.translations}>{locales.map((locale) => { const translation = detail.translations.find((item) => item.locale === locale); return <article className={styles.translation} key={locale}><h4>{t(`language${locale.toUpperCase()}`)}</h4><div><strong>{t("titleField")}</strong><p>{translation?.title ?? "-"}</p></div><div><strong>{t("descriptionField")}</strong>{translation?.description ? <RichText html={translation.description} /> : <p>-</p>}</div></article>; })}</div></section>
          <section className={styles.detailSection}><h3>{t("pricing")}</h3><div className={styles.detailGrid}><div><strong>{t("price")}</strong><span>{displayValue(detail.price)}</span></div><div><strong>{t("priceType")}</strong><span>{displayValue(detail.price_type)}</span></div><div><strong>{t("currency")}</strong><span>{displayValue(detail.currency?.code)}</span></div><div><strong>{t("priceRange")}</strong><span>{`${displayValue(detail.minimum_price)} - ${displayValue(detail.maximum_price)}`}</span></div><div><strong>{t("salaryPeriod")}</strong><span>{displayValue(detail.salary_period)}</span></div></div></section>
          <section className={styles.detailSection}><h3>{t("listingFlags")}</h3><div className={styles.detailGrid}>{([['isNegotiable', detail.is_negotiable], ['isUrgent', detail.is_urgent], ['isPhoneVisible', detail.is_phone_visible], ['allowMessages', detail.allow_messages]] as const).map(([label, enabled]) => <div key={label}><strong>{t(label)}</strong><span>{enabled ? t("yes") : t("no")}</span></div>)}</div></section>
          <section className={styles.detailSection}><h3>{t("contact")}</h3><div className={styles.detailGrid}><div><strong>{t("contactName")}</strong><span>{displayValue(detail.contact_name)}</span></div><div><strong>{t("contactPhone")}</strong><span>{displayValue(detail.contact_phone)}</span></div><div><strong>{t("contactEmail")}</strong><span>{displayValue(detail.contact_email)}</span></div></div></section>
          <section className={styles.detailSection}><h3>{t("location")}</h3><div className={styles.detailGrid}><div className={styles.detailWide}><strong>{t("address")}</strong><span>{displayValue(detail.address)}</span></div><div><strong>{t("administrativeArea")}</strong><span>{displayValue(detail.administrative_area_id)}</span></div><div><strong>{t("coordinates")}</strong><span>{detail.latitude === null || detail.longitude === null ? "-" : `${detail.latitude}, ${detail.longitude}`}</span></div></div></section>
          <section className={styles.detailSection}><h3>{t("attributes")}</h3>{detail.values?.length ? <div className={styles.attributeGrid}>{detail.values.map((item) => { const condition = item.attribute?.code === "vehicle_body_condition" ? vehicleCondition(item.json_value) : null; return <div key={item.attribute_id} className={condition ? styles.attributeWide : ""}><strong>{item.attribute?.code ?? item.attribute_id}</strong>{condition ? <VehicleBodyConditionMap value={condition} readOnly /> : <span>{attributeValue(item)}</span>}</div>; })}</div> : <p>{t("noAttributes")}</p>}</section>
          <section className={styles.detailSection}><h3>{t("media")}</h3>{detail.media?.length ? <div className={styles.detailMedia}>{detail.media.map((item) => <figure key={item.id}><img src={item.url ?? ""} alt={item.original_name ?? ""} /><figcaption>{item.original_name ?? ""}</figcaption></figure>)}</div> : <p>{t("noMedia")}</p>}</section>
        </div> : null}
      </Dialog>
    </AdminPageGuard>
  );
}
