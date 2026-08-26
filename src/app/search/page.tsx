import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { marketplace } from "@/features/listings/container";
import { CategorySidebar } from "@/features/catalog/category-sidebar";
import { ListingRow } from "@/features/listings/listing-row";
import { LocalizedLink as Link } from "@/shared/ui/localized-link";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q || params.category;
  return { title: query ? `Search: ${query}` : "Listings", description: query ? `Browse Malik listings for ${query}.` : "Browse published Malik listings.", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const p = await searchParams;
  const t = await getTranslations("search");
  const categories = await marketplace.listCategories.execute();
  const selectedCategory = categories.find((category) => category.slug === p.category);
  const dynamicFilters = selectedCategory ? await marketplace.listCategoryFilters.execute(selectedCategory.id) : [];
  const attributes = Object.fromEntries(Object.entries(p).filter(([key, value]) => key.startsWith("attributes[") && value).map(([key, value]) => [key.slice(11, -1), value as string]));
  const page = await marketplace.searchListingsPage.execute({
      q: p.q,
      category: p.category,
      city: p.city,
      minPrice: p.min_price ? Number(p.min_price) : undefined,
      maxPrice: p.max_price ? Number(p.max_price) : undefined,
      attributes,
      featured: p.featured === "true" ? true : undefined,
      page: p.page ? Number(p.page) : 1,
      perPage: 20,
      sort: p.sort as
        | "newest"
        | "oldest"
        | "price_asc"
        | "price_desc"
        | "popular"
        | undefined,
    });
  const listings = page.items;
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
          </div>
          <form className="search-filter-form" method="get">
            <input name="q" defaultValue={p.q} placeholder={t("searchPlaceholder")} />
            {p.category ? <input type="hidden" name="category" value={p.category} /> : null}
            <input name="min_price" inputMode="numeric" defaultValue={p.min_price} placeholder={t("minPrice")} />
            <input name="max_price" inputMode="numeric" defaultValue={p.max_price} placeholder={t("maxPrice")} />
            <label className="listing-filter-sort">
              <span>{t("sort")}</span>
              <select name="sort" defaultValue={p.sort ?? "newest"}>
                <option value="default">{t("defaultSort")}</option>
                <option value="price_asc">{t("priceAscending")}</option>
                <option value="price_desc">{t("priceDescending")}</option>
                <option value="newest">{t("newest")}</option>
                <option value="oldest">{t("oldest")}</option>
                <option value="most_viewed">{t("mostViewed")}</option>
                <option value="most_popular">{t("mostPopular")}</option>
              </select>
            </label>
            {dynamicFilters.map((field) => field.options?.length ? <select key={field.code} name={`attributes[${field.code}]`} defaultValue={p[`attributes[${field.code}]`] ?? ""}><option value="">{field.label ?? field.code}</option>{field.options.map((option) => <option key={option.slug} value={option.slug}>{option.label ?? option.value}</option>)}</select> : <input key={field.code} name={`attributes[${field.code}]`} defaultValue={p[`attributes[${field.code}]`]} placeholder={field.label ?? field.code} />)}
            <button type="submit">{t("applyFilters")}</button>
          </form>
          {p.q || p.category || p.min_price || p.max_price ? <div className="filter-chips">{[p.q || null, p.category || null, p.min_price ? `>= ${p.min_price}` : null, p.max_price ? `<= ${p.max_price}` : null].filter(Boolean).map((chip) => <span key={chip}>{chip}</span>)}</div> : null}
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
            {Array.from({ length: page.lastPage }, (_, index) => index + 1).slice(Math.max(0, page.currentPage - 3), page.currentPage + 2).map((number) => <Link key={number} href={`?${new URLSearchParams({ ...p, page: String(number) } as Record<string, string>).toString()}`} aria-current={number === page.currentPage ? "page" : undefined} className={number === page.currentPage ? "selected" : ""}>{number}</Link>)}
          </nav>
        </section>
      </div>
    </main>
  );
}
