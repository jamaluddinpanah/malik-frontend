import { getTranslations } from "next-intl/server";
import { marketplace } from "@/infrastructure/container";
import { CategorySidebar } from "@/presentation/components/category-sidebar";
import { ListingRow } from "@/presentation/components/listing-row";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SearchPage({ searchParams }: Props) {
  const p = await searchParams;
  const t = await getTranslations("search");
  const [listings, categories] = await Promise.all([
    marketplace.searchListings.execute({
      q: p.q,
      category: p.category,
      city: p.city,
      featured: p.featured === "true",
      sort: p.sort as
        | "newest"
        | "price_asc"
        | "price_desc"
        | "popular"
        | undefined,
    }),
    marketplace.listCategories.execute(),
  ]);
  const heading = p.q
    ? t("resultsFor", { query: p.q })
    : p.category
      ? t("categoryResults", { category: p.category })
      : t("listings");

  return (
    <main className="shell page">
      <div className="breadcrumbs">
        {t("home")}　 {t("listings")}
      </div>
      <div className="search-layout">
        <CategorySidebar categories={categories} />
        <section className="search-results">
          <div className="results-head">
            <h1 dir="auto">{heading}</h1>
            <label>
              <span className="visually-hidden">{t("sort")}</span>
              <select defaultValue={p.sort ?? "default"}>
                <option value="default">{t("defaultSort")}</option>
                <option value="price_asc">{t("priceAscending")}</option>
                <option value="newest">{t("newest")}</option>
              </select>
            </label>
          </div>
          {listings.length ? (
            <div className="row-list">
              {listings.map((listing) => (
                <ListingRow key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>{t("emptyTitle")}</h2>
              <p>{t("emptyDescription")}</p>
            </div>
          )}
          <nav className="pagination" aria-label={t("pagination")}>
            <b aria-current="page" className="selected">
              1
            </b>
            <b>2</b>
            <b>3</b>
            <b>4</b>
            <b>20</b>
          </nav>
        </section>
      </div>
    </main>
  );
}
