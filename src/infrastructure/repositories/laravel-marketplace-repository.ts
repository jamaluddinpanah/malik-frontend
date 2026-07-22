import type { Category, Listing } from "@/domain/listings/entities";
import type {
  CategoryRepository,
  ListingFilters,
  ListingRepository,
} from "@/domain/listings/repositories";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";
import { getLocale } from "next-intl/server";

type RawValue =
  | string
  | number
  | boolean
  | null
  | RawValue[]
  | { [key: string]: RawValue };
type RawListing = { [key: string]: RawValue };

function record(value: RawValue | undefined): RawListing {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function list(value: RawValue | undefined): RawListing[] {
  return Array.isArray(value) ? value.map((item) => record(item)) : [];
}

function mapListing(raw: RawListing): Listing {
  const category = record(raw.category);
  const owner = record(raw.owner);
  const media = list(raw.media);
  return {
    id: Number(raw.id),
    slug: String(raw.slug ?? raw.id),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    price: Number(raw.price ?? 0),
    currency: String(record(raw.currency).code ?? raw.currency_code ?? "AFN"),
    city: String(raw.city ?? record(raw.administrative_area).name ?? ""),
    district: String(raw.district ?? ""),
    conditionLabel: String(raw.condition ?? ""),
    isFeatured: Boolean(raw.is_featured),
    status: raw.status === "published" ? "active" : "draft",
    viewCount: Number(raw.view_count ?? 0),
    createdAt: String(
      raw.created_at ?? raw.published_at ?? new Date().toISOString(),
    ),
    categorySlug: String(category.slug ?? ""),
    categoryName: String(category.name ?? category.slug ?? ""),
    sellerName: String(owner.name ?? ""),
    sellerPhone: typeof owner.phone === "string" ? owner.phone : undefined,
    images: media.map((media: RawListing, index: number) => ({
      url: String(media.url ?? media.path ?? ""),
      alt: String(media.alt_text ?? raw.title ?? ""),
      sortOrder: Number(media.sort_order ?? index + 1),
    })),
  };
}

async function request<T>(path: string): Promise<T> {
  const locale = await getLocale();
  const response = await fetch(`${env.apiUrl}${path}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": locale,
      "X-Malik-Locale": locale,
    },
    next: { revalidate: 30 },
  });
  if (!response.ok)
    throw new Error(`Marketplace request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export class LaravelMarketplaceRepository
  implements ListingRepository, CategoryRepository
{
  async list(): Promise<Category[]> {
    const response = await request<{ data: RawListing[] }>(
      routes.api.categories,
    );
    const flatten = (items: RawListing[], parentSlug?: string): Category[] =>
      items.flatMap((item) => [
        {
          id: Number(item.id),
          slug: String(item.slug),
          name: String(item.name ?? item.slug),
          parentSlug,
           listingCount: Number(item.listing_count ?? 0),
          icon: typeof item.icon === "string" ? item.icon : null,
          default_expanded: Boolean(item.default_expanded),
        },
        ...flatten(list(item.children), String(item.slug)),
      ]);
    return flatten(response.data);
  }

  async search(filters: ListingFilters): Promise<Listing[]> {
    const params = new URLSearchParams({ per_page: "50" });
    if (filters.q) params.set("q", filters.q);
    if (filters.city) params.set("city", filters.city);
    if (filters.minPrice !== undefined)
      params.set("min_price", String(filters.minPrice));
    if (filters.maxPrice !== undefined)
      params.set("max_price", String(filters.maxPrice));
    if (filters.sort === "price_asc") params.set("sort", "price_asc");
    if (filters.sort === "price_desc") params.set("sort", "price_desc");
    if (filters.sort === "popular") params.set("sort", "most_viewed");
    const response = await request<{
      data: RawListing[] | { data?: RawListing[] };
    }>(
      `${routes.api.listings}?${params}`,
    );
    const items = Array.isArray(response.data)
      ? response.data
      : response.data?.data ?? [];
    return items.map(mapListing);
  }

  async findBySlug(slug: string): Promise<Listing | null> {
    try {
      const response = await request<{ data: RawListing }>(
        routes.api.listingBySlug(slug),
      );
      return mapListing(response.data);
    } catch {
      return null;
    }
  }

  async incrementViews(): Promise<void> {
    return Promise.resolve();
  }
}
