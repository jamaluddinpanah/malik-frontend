/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { AppLocale } from "@/shared/i18n/config";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/formatting/locale";
import { marketplace } from "@/features/listings/container";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import styles from "./listing.module.css";
import { ListingGallery } from "./listing-gallery";
import { FavoriteButton } from "@/features/listings/favorite-button";
import { ListingContactControls } from "@/features/listings/listing-contact-controls";
import { MessageSellerButton } from "@/features/messaging/message-seller-button";
import { ListingViewTracker } from "@/features/listings/listing-view-tracker";
import { JobApplicationForm } from "@/features/jobs/job-applications-and-team-management";
import { jsonLd } from "@/shared/lib/json-ld";
import { VehicleBodyConditionMap } from "@/features/catalog/vehicle-body-condition-map";
import { ListingMap } from "@/features/listings/listing-map";
import { listingLocation } from "@/features/listings/entities";
import { RichText } from "@/shared/ui";
import { richTextToPlainText } from "@/shared/lib/rich-text";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const listing = await marketplace.getListing.execute(slug);
  if (!listing) return { title: "Listing not found" };
  const locale = await getLocale();
  const description = richTextToPlainText(listing.description).slice(0, 160);
  return { title: listing.title, description, alternates: { canonical: `/${locale}/listing/${listing.slug}`, languages: { en: `/en/listing/${listing.slug}`, fa: `/fa/listing/${listing.slug}`, ps: `/ps/listing/${listing.slug}` } }, openGraph: { title: listing.title, description, images: listing.images[0]?.url ? [listing.images[0].url] : undefined } };
}

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
  const locationDisplay = listingLocation(listing);
  const details: [string, React.ReactNode][] = [
    [t("listingNumber"), formatNumber(listing.id, locale)],
    [t("listingDate"), formatDate(listing.createdAt, locale)],
    [t("category"), category],
  ];
  if (listing.conditionLabel.trim())
    details.push([t("condition"), <bdi key="condition">{listing.conditionLabel}</bdi>]);
  details.push([
    t("location"),
    <span dir="auto" key="location">
      <bdi>{locationDisplay}</bdi>
    </span>,
  ]);
  const isJob = listing.categorySlug.toLowerCase().includes("job");
  const vehicleCondition = listing.attributes?.find(
    (attribute) => attribute.type === "vehicle-condition-map",
  );
  for (const attribute of listing.attributes ?? []) {
    if (attribute.type === "text")
      details.push([attribute.label, <bdi key={attribute.label}>{attribute.value}</bdi>]);
  }
  return (
    <main className={styles.page}>
      <ListingViewTracker listingId={listing.id} />
      <div className={styles.shell}>
        <nav className={styles.crumb} aria-label={t("breadcrumbs")}>
          <Link href="/">{t("home")}</Link>　 {category}　 {t("listing")}
        </nav>
        <div className={styles.top}>
          <section>
            <h1 dir="auto">{listing.title}</h1>
            <h2>{formatCurrency(listing.price, listing.currency, locale)}</h2>
            <FavoriteButton listingId={listing.id} initial={listing.isFavorited} />
            <p dir="auto">
              <bdi>{locationDisplay}</bdi>　{" "}
              {listedAt}　{" "}
              {t("views", { count: formatNumber(listing.viewCount, locale) })}
            </p>
          </section>
          <aside className={styles.seller}>
            <b dir="auto">{listing.sellerName}</b>
            <small>
              <bdi>{locationDisplay}</bdi> / {listedAt}
            </small>
             <MessageSellerButton listingId={listing.id} ownerUserId={listing.ownerUserId} />
             <ListingContactControls listingId={listing.id} ownerUserId={listing.ownerUserId} phoneVisible={Boolean(listing.phoneVisible)} email={listing.contactEmail} />
            <p>{t("contactNotice")}</p>
          </aside>
        </div>
        <div className={styles.vehicleGrid}>
           <ListingGallery images={listing.images} title={listing.title} emptyLabel={t("noImage")} />
           <InfoTable title={t("details")} rows={details} />
            {listing.rootType === "vehicle" ? (
              <VehicleBodyConditionMap
                value={vehicleCondition?.value ?? null}
                readOnly
              />
            ) : null}
            <section className={styles.description}>
            <h2>{t("description")}</h2>
            <RichText html={listing.description} className={styles.descriptionBody} />
           </section>
            {isJob ? <JobApplicationForm listingId={listing.id} ownerUserId={listing.ownerUserId} /> : null}
          <section className={styles.location}>
            <h2>{t("location")}</h2>
            <p dir="auto">
              <bdi>{locationDisplay}</bdi>
            </p>
            <div className={styles.map}>
              <ListingMap location={listing.location} />
            </div>
            <small className={styles.approximate}>{t("approximateLocation")}</small>
          </section>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "Product", name: listing.title, description: richTextToPlainText(listing.description), image: listing.images.map((image) => image.url), offers: { "@type": "Offer", price: listing.price, priceCurrency: listing.currency, availability: "https://schema.org/InStock" } }) }} />
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
                    <bdi>{listingLocation(item)}</bdi>
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
