import { LocalizedLink as Link } from "@/shared/ui/localized-link";
import { getLocale, getTranslations } from "next-intl/server";
import {
  BriefcaseBusiness,
  Car,
  House,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { marketplace } from "@/features/listings/container";
import { CategorySidebar } from "@/features/catalog/category-sidebar";
import { ListingCard } from "@/features/listings/listing-card";
import { SearchForm } from "@/features/listings/search-form";
import { ActiveBanner } from "@/features/content/active-banner";

const featuredCategories: {
  slug: string;
  label: "realEstate" | "vehicles" | "goods" | "jobs";
  icon: LucideIcon;
  className: string;
}[] = [
  { slug: "real-estate", label: "realEstate", icon: House, className: "t1" },
  { slug: "vehicles", label: "vehicles", icon: Car, className: "t0" },
  { slug: "goods", label: "goods", icon: ShoppingBag, className: "t4" },
  { slug: "jobs", label: "jobs", icon: BriefcaseBusiness, className: "t3" },
];

export default async function Home() {
  const t = await getTranslations("home");
  const locale = (await getLocale()) as "en" | "fa" | "ps";
  const [categories, listings, mostViewed, mostPopular, searchedAll, searchedGoods, searchedVehicles, searchedJobs] = await Promise.all([
    marketplace.listCategories.execute(),
    marketplace.searchListings.execute({ featured: true }),
    marketplace.analytics.mostViewed(),
    marketplace.analytics.mostPopular(),
    marketplace.analytics.topSearched("all"),
    marketplace.analytics.topSearched("goods"),
    marketplace.analytics.topSearched("vehicle"),
    marketplace.analytics.topSearched("job"),
  ]);
  const roots = categories.filter((category) => !category.parentSlug);
  return (
    <main>
      <section className="hero">
        <div className="shell hero-copy">
          <h1>{t("heroTitle")}</h1>
          <p>{t("heroDescription")}</p>
          <SearchForm />
        </div>
      </section>
      <div className="shell home-layout">
        <CategorySidebar categories={categories} />
        <div className="home-content">
          <ActiveBanner placement="home" />
          <section className="section category-section">
            <div className="section-title">
              <h2>{t("featuredCategories")}</h2>
              <Link href="/search">{t("viewAll")}</Link>
            </div>
            <div className="categories">
              {featuredCategories.map(
                ({ slug, label, icon: Icon, className }) => {
                  const category = roots.find((item) => item.slug === slug);
                  if (!category) return null;
                  return (
                    <Link
                      className={`category-tile ${className}`}
                      key={slug}
                        href={`/search?category=${slug}`}
                    >
                      <em>
                        <Icon size={29} />
                      </em>
                      <b>{t(label)}</b>
                      <small>
                        {new Intl.NumberFormat(locale).format(
                          category.listingCount,
                        )}{" "}
                        {t("listings")}
                      </small>
                    </Link>
                  );
                },
              )}
            </div>
          </section>
          {listings.length ? <section className="featured-box">
            <div className="section-title">
              <h2>{t("featuredListings")}</h2>
              <Link href="/search">{t("viewAll")}</Link>
            </div>
            <div className="grid compact-grid">
              {listings.slice(0, 12).map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                  />
              ))}
            </div>
          </section> : null}
          <section className="how">
            <h2>{t("howTitle")}</h2>
            <div>
              {([1, 2, 3] as const).map((number) => (
                <article key={number}>
                  <b>{new Intl.NumberFormat(locale).format(number)}</b>
                  <h3>{t(`step${number}Title`)}</h3>
                  <p>{t(`step${number}Body`)}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="link-groups analytics-groups">
            <AnalyticsSection title={t("mostViewed")} listings={mostViewed} />
            <AnalyticsSection title={t("mostPopular")} listings={mostPopular} />
            <SearchAnalyticsSection title={t("groups.popularSearches.title")} terms={searchedAll} />
            <SearchAnalyticsSection title={t("topSearchedGoods")} terms={searchedGoods} />
            <SearchAnalyticsSection title={t("topSearchedVehicles")} terms={searchedVehicles} />
            <SearchAnalyticsSection title={t("topSearchedJobs")} terms={searchedJobs} />
          </section>
        </div>
      </div>
    </main>
  );
}

function AnalyticsSection({ title, listings }: { title: string; listings: Array<{ id: number; slug: string; title: string }> }) {
  if (!listings.length) return null;
  return <div><b>{title}</b><p>{listings.slice(0, 6).map((listing) => <Link key={listing.id} href={`/listing/${listing.slug}`}>{listing.title}</Link>)}</p></div>;
}

function SearchAnalyticsSection({ title, terms }: { title: string; terms: Array<{ normalized_query: string; search_count: number }> }) {
  if (!terms.length) return null;
  return <div><b>{title}</b><p>{terms.slice(0, 6).map((term) => <Link key={term.normalized_query} href={`/search?q=${encodeURIComponent(term.normalized_query)}`}>{term.normalized_query}</Link>)}</p></div>;
}
