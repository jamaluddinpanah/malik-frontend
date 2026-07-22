/* eslint-disable @next/next/no-img-element */
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/config";
import {
  formatCurrency,
  formatNumber,
  formatRelativeTime,
} from "@/lib/formatting/locale";
import { LocalizedLink as Link } from "@/presentation/components/localized-link";
import { marketplace } from "@/infrastructure/container";
import styles from "./real-estate.module.css";

const photos = [
  "cozy-room.jpg",
  "villa.jpg",
  "kitchen.jpg",
  "building.jpg",
  "room.jpg",
  "bathroom.jpg",
  "home-exterior.jpg",
  "modern-interior.jpg",
  "balcony.jpg",
  "house-front.jpg",
];
const showcaseTitles = [
  "Karte Parwan 3+1 apartment",
  "Detached villa with garden",
  "Shahr-e Naw furnished kitchen",
  "Commercial office city view",
  "Mazar cozy apartment",
  "Surkh Road residence",
  "Aino Mina family home",
];
const categoryKeys = [
  "residential",
  "commercial",
  "land",
  "developments",
  "buildings",
  "timeshares",
  "tourism",
] as const;
const categoryCounts = [737088, 149593, 251319, 1301, 8586, 2930, 1435];

export default async function RealEstate() {
  const [listings, t, localeValue] = await Promise.all([
    marketplace.searchListings.execute({ category: "realestate" }),
    getTranslations("realEstate"),
    getLocale(),
  ]);
  const locale = localeValue as AppLocale;
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.side}>
          <h1>{t("title")}</h1>
          {categoryKeys.map((key, index) => (
            <Link key={key} href={`/search?category=${key}`}>
              {t(key)}　({formatNumber(categoryCounts[index], locale)})
            </Link>
          ))}
          <b>{t("allCategories")}</b>
        </aside>
        <section className={styles.content}>
          <div className={styles.filter}>
            <nav aria-label={t("propertyType")}>
              {categoryKeys.slice(0, 6).map((key, index) => (
                <button
                  type="button"
                  className={index === 0 ? styles.active : ""}
                  key={key}
                >
                  {t(key)}
                </button>
              ))}
            </nav>
            <div className={styles.fields}>
              <select aria-label={t("purpose")}>
                <option>{t("forSale")}</option>
              </select>
              <select aria-label={t("propertyType")}>
                <option>{t("residential")}</option>
              </select>
              <select aria-label={t("city")}>
                <option>{t("city")}</option>
              </select>
              <select aria-label={t("district")}>
                <option>{t("district")}</option>
              </select>
              <select aria-label={t("quarter")}>
                <option>{t("quarter")}</option>
              </select>
              <input
                aria-label={t("minimumPrice")}
                placeholder={t("minimumPrice")}
              />
              <input
                aria-label={t("maximumPrice")}
                placeholder={t("maximumPrice")}
              />
              <select aria-label={t("currency")}>
                <option>AFN</option>
              </select>
              <select aria-label={t("rooms")}>
                <option>{t("rooms")}</option>
              </select>
              <button type="button">{t("search")}</button>
              <button type="button">{t("mapSearch")}</button>
            </div>
            <a href="#more">{t("moreOptions")}</a>
          </div>
          <section className={styles.showcase}>
            <h2>
              {t("showcase")}
              <Link href="/search?category=realestate&featured=true">
                {t("showAll")}
              </Link>
            </h2>
            <div>
              {photos.map((photo, index) => (
                <article key={photo}>
                  <img
                    src={`/assets/real-estate/${photo}`}
                    alt={t("propertyImage")}
                  />
                  <p dir="auto">
                    {showcaseTitles[index % showcaseTitles.length]}
                  </p>
                  <small>
                    {formatCurrency(2500000 + index * 700000, "AFN", locale, 0)}
                  </small>
                </article>
              ))}
            </div>
          </section>
          <section className={styles.latest}>
            <h2>
              {t("latest")}
              <select aria-label={t("sort")}>
                <option>{t("mostRecent")}</option>
              </select>
            </h2>
            {listings.length ? (
              listings.map((listing) => (
                <Link
                  href={`/listing/${listing.slug}`}
                  className={styles.result}
                  key={listing.id}
                >
                  <img src={listing.images[0]?.url} alt="" />
                  <span>
                    <b dir="auto">{listing.title}</b>
                    <p dir="auto">{listing.description}</p>
                    <small>
                      <bdi>{listing.city}</bdi> / <bdi>{listing.district}</bdi>{" "}
                      · {formatRelativeTime(-2, "hour", locale)}
                    </small>
                  </span>
                  <strong>
                    {formatCurrency(listing.price, listing.currency, locale)}
                  </strong>
                </Link>
              ))
            ) : (
              <p>{t("empty")}</p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
