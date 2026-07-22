/* eslint-disable @next/next/no-img-element */
import { LocalizedLink as Link } from "./localized-link";
import { Clock3, Eye, MapPin } from "lucide-react";
import type { Listing } from "@/domain/listings/entities";
import { money } from "./listing-card";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber, formatRelativeTime } from "@/lib/formatting/locale";
import type { AppLocale } from "@/i18n/config";
export function ListingRow({ listing }: { listing: Listing }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("listing");
  return (
    <Link className="listing-row" href={`/listing/${listing.slug}`}>
      <img src={listing.images[0]?.url} alt="" />
      <span>
        <b dir="auto">{listing.title}</b>
        <strong>{money(listing.price, listing.currency, locale)}</strong>
        <p dir="auto">{listing.description}</p>
        <small>
          <MapPin size={12} /> <bdi>{listing.city}</bdi> /{" "}
          <bdi>{listing.district}</bdi>　 <Clock3 size={12} />{" "}
          {formatRelativeTime(-2, "hour", locale)}　 <Eye size={12} />{" "}
          {t("views", { count: formatNumber(listing.viewCount, locale) })}
        </small>
      </span>
    </Link>
  );
}
