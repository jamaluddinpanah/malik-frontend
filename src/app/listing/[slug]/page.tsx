/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/config";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/formatting/locale";
import { marketplace } from "@/infrastructure/container";
import { LocalizedLink as Link } from "@/presentation/components/localized-link";
import styles from "./listing.module.css";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [listing, t, localeValue] = await Promise.all([
    marketplace.getListing.execute(slug),
    getTranslations("listing"),
    getLocale(),
  ]);
  if (!listing) notFound();
  const locale = localeValue as AppLocale;
  const similar = (
    await marketplace.searchListings.execute({ category: listing.categorySlug })
  )
    .filter((item) => item.slug !== slug)
    .slice(0, 4);
  const listedAt = formatDateTime(listing.createdAt, locale);
  const category = t.has(`categories.${listing.categorySlug}`)
    ? t(`categories.${listing.categorySlug}`)
    : listing.categoryName;
  const details: [string, React.ReactNode][] = [
    [t("listingNumber"), formatNumber(listing.id, locale)],
    [t("listingDate"), formatDate(listing.createdAt, locale)],
    [t("category"), category],
    [t("condition"), <bdi key="condition">{listing.conditionLabel}</bdi>],
    [
      t("location"),
      <span dir="auto" key="location">
        <bdi>{listing.city}</bdi> / <bdi>{listing.district}</bdi>
      </span>,
    ],
  ];
  const mainImage = listing.images[0]?.url;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.crumb} aria-label={t("breadcrumbs")}>
          <Link href="/">{t("home")}</Link>　 {category}　 {t("listing")}
        </nav>
        <div className={styles.top}>
          <section>
            <h1 dir="auto">{listing.title}</h1>
            <h2>{formatCurrency(listing.price, listing.currency, locale)}</h2>
            <p dir="auto">
              <bdi>{listing.city}</bdi> / <bdi>{listing.district}</bdi>　{" "}
              {listedAt}　{" "}
              {t("views", { count: formatNumber(listing.viewCount, locale) })}
            </p>
          </section>
          <aside className={styles.seller}>
            <b dir="auto">{listing.sellerName}</b>
            <small>
              <bdi>{listing.city}</bdi> / {listedAt}
            </small>
            <button type="button">{t("messageSeller")}</button>
            {listing.sellerPhone ? (
              <a href={`tel:${listing.sellerPhone}`}>{t("showPhone")}</a>
            ) : null}
            <p>{t("contactNotice")}</p>
          </aside>
        </div>
        <div className={styles.vehicleGrid}>
          <section className={styles.gallery}>
            <img
              src={mainImage}
              alt={listing.images[0]?.alt ?? listing.title}
            />
            {listing.images.length > 1 ? (
              <div>
                {listing.images.map((image) => (
                  <img
                    src={image.url}
                    alt={image.alt || listing.title}
                    key={image.url}
                  />
                ))}
              </div>
            ) : null}
          </section>
          <InfoTable title={t("details")} rows={details} />
          <section className={styles.description}>
            <h2>{t("description")}</h2>
            <p dir="auto">{listing.description}</p>
          </section>
          <section className={styles.location}>
            <h2>{t("location")}</h2>
            <p dir="auto">
              <bdi>{listing.city}</bdi> / <bdi>{listing.district}</bdi>
            </p>
            <div className={styles.map}>
              {t("map")}
              <small>{t("approximateLocation")}</small>
            </div>
          </section>
        </div>
        {similar.length ? (
          <section className={styles.similar}>
            <h2>{t("similar")}</h2>
            <div>
              {similar.map((item) => (
                <Link href={`/listing/${item.slug}`} key={item.id}>
                  <img src={item.images[0]?.url} alt="" />
                  <b>{formatCurrency(item.price, item.currency, locale)}</b>
                  <p dir="auto">{item.title}</p>
                  <small dir="auto">
                    <bdi>{item.city}</bdi> / <bdi>{item.district}</bdi>
                  </small>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function InfoTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, React.ReactNode][];
}) {
  return (
    <section className={styles.info}>
      <h2>{title}</h2>
      {rows.map(([label, value]) => (
        <p key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </p>
      ))}
    </section>
  );
}
