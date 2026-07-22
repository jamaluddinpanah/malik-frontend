/* eslint-disable @next/next/no-img-element */
import { useLocale, useTranslations } from "next-intl";
import { LocalizedLink as Link } from "./localized-link";
import type { Listing } from "@/domain/listings/entities";
import { formatCurrency } from "@/lib/formatting/locale";
export function money(value: number, currency: string, locale = "en") {
  return formatCurrency(value, currency, locale as "en" | "fa" | "ps");
}
export function ListingCard({ listing }: { listing: Listing }) {
  const locale = useLocale();
  const t = useTranslations("listing");
  return (
    <article className="card">
      <Link href={`/listing/${listing.slug}`}>
        {/* Remote legacy seed images are intentionally rendered directly; the future media service will supply optimized assets. */}
        <img
          src={listing.images[0]?.url}
          alt={listing.images[0]?.alt ?? listing.title}
        />
      </Link>
      <div className="card-body">
        {listing.badge && (
          <span className={`badge ${listing.badge}`}>
            {t(`badge.${listing.badge}`)}
          </span>
        )}
        <Link href={`/listing/${listing.slug}`}>
          <h3 dir="auto">{listing.title}</h3>
        </Link>
        <strong>{money(listing.price, listing.currency, locale)}</strong>
        <p dir="auto">
          <bdi>{listing.city}</bdi> · <bdi>{listing.district}</bdi> ·{" "}
          <bdi>{listing.conditionLabel}</bdi>
        </p>
      </div>
    </article>
  );
}
