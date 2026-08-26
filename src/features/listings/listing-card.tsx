/* eslint-disable @next/next/no-img-element */
import { useLocale, useTranslations } from "next-intl";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { listingLocation, type Listing } from "@/features/listings/entities";
import { formatCurrency } from "@/shared/lib/formatting/locale";
import { FavoriteButton } from "./favorite-button";
export function money(value: number, currency: string, locale = "en") {
  return formatCurrency(value, currency, locale as "en" | "fa" | "ps");
}
export function ListingCard({ listing }: { listing: Listing }) {
  const locale = useLocale();
  const t = useTranslations("listing");
  const metadata = [listingLocation(listing), listing.conditionLabel].filter(
    (value) => value && value !== "-",
  );
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
        <FavoriteButton listingId={listing.id} initial={listing.isFavorited} />
        {listing.badges.length ? <div className="badge-group">
          {listing.badges.map((badge) => <span className={`badge ${badge}`} key={badge}>{t(`badge.${badge}`)}</span>)}
        </div> : null}
        <Link href={`/listing/${listing.slug}`}>
          <h3 dir="auto">{listing.title}</h3>
        </Link>
        <strong>{money(listing.price, listing.currency, locale)}</strong>
        {metadata.length ? (
          <p dir="auto">
            {metadata.map((value, index) => (
              <span key={`${value}-${index}`}>
                {index ? " · " : null}
                <bdi>{value}</bdi>
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </article>
  );
}
