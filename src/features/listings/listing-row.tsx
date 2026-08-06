/* eslint-disable @next/next/no-img-element */
import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { Clock3, Eye, MapPin } from "lucide-react";
import type { Listing } from "@/features/listings/entities";
import { money } from "./listing-card";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, formatNumber } from "@/shared/lib/formatting/locale";
import type { AppLocale } from "@/shared/i18n/config";
import { FavoriteButton } from "./favorite-button";
import { richTextToPlainText } from "@/shared/lib/rich-text";
export function ListingRow({ listing }: { listing: Listing }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("listing");
  return (
    <article className="listing-row">
      <Link className="listing-row-content" href={`/listing/${listing.slug}`}>
        {listing.images[0]?.url ? <img src={listing.images[0].url} alt={listing.images[0]?.alt || listing.title} /> : <span className="listing-row-image-placeholder">{t("noImage")}</span>}
        <div className="listing-row-info">
        {listing.badges.length ? <span className="listing-row-badges">
          {listing.badges.map((badge) => <span className={`listing-row-badge ${badge}`} key={badge}>{t(`badge.${badge}`)}</span>)}
        </span> : null}
        <b dir="auto">{listing.title}</b>
        <strong>{money(listing.price, listing.currency, locale)}</strong>
        <p dir="auto">{richTextToPlainText(listing.description)}</p>
        <small>
          <MapPin size={12} /> <bdi>{listing.city}</bdi> /{" "}
          <bdi>{listing.district}</bdi>　 <Clock3 size={12} />{" "}
          {formatDate(listing.createdAt, locale)}　 <Eye size={12} />{" "}
          {t("views", { count: formatNumber(listing.viewCount, locale) })}
        </small>
        </div>
      </Link>
      <div className="listing-row-favorite"><FavoriteButton listingId={listing.id} initial={listing.isFavorited} /></div>
    </article>
  );
}
