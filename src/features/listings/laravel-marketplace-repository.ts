import type { Category, Listing } from "@/features/listings/entities";
import type {
  CategoryRepository,
  ListingFilters,
  ListingPage,
  ListingRepository,
} from "@/features/listings/repositories";
import { env } from "@/shared/lib/env";
import { routes } from "@/shared/lib/routes";
import { getLocale } from "next-intl/server";

type RawValue =
  | string
  | number
  | boolean
  | null
  | RawValue[]
  | { [key: string]: RawValue };
type RawListing = { [key: string]: RawValue };

class MarketplaceRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Marketplace request failed: ${status}`);
  }
}

function record(value: RawValue | undefined): RawListing {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function list(value: RawValue | undefined): RawListing[] {
  return Array.isArray(value) ? value.map((item) => record(item)) : [];
}

function mediaUrl(value: RawValue | undefined): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const parsed = new URL(value, env.apiUrl);
    return parsed.pathname.startsWith("/storage/")
      ? `${env.apiUrl}${parsed.pathname}${parsed.search}`
      : parsed.toString();
  } catch {
    return value;
  }
}

function mapListing(raw: RawListing): Listing {
  const category = record(raw.category);
  const owner = record(raw.owner);
  const media = list(raw.media);
  const administrativeArea = record(raw.administrative_area);
  const areaHierarchy = list(administrativeArea.hierarchy)
    .map((area) => ({ id: Number(area.id) || undefined, type: typeof area.type === "string" ? area.type : undefined, name: typeof area.name === "string" ? area.name : "" }))
    .filter((area) => area.name);
  const selectedAreaName = areaHierarchy.at(-1)?.name ?? (typeof administrativeArea.name === "string" ? administrativeArea.name : "");
  const attributes = list(raw.values).map((item) => {
    const attribute = record(item.attribute);
    const value = item.string_value ?? item.text_value ?? item.integer_value ?? item.decimal_value ?? item.boolean_value ?? item.date_value ?? item.datetime_value ?? item.json_value;
    const label = String(attribute.name ?? attribute.code ?? "");
    if (
      (attribute.input_type === "vehicle-condition-map" || attribute.code === "vehicle_body_condition") &&
      value && typeof value === "object" && !Array.isArray(value)
    ) {
      return {
        type: "vehicle-condition-map" as const,
        label,
        value: Object.fromEntries(
          Object.entries(value).flatMap(([part, condition]) =>
            typeof condition === "string" ? [[part, condition]] : [],
          ),
        ) as Record<string, string>,
      };
    }
    return { type: "text" as const, label, value: typeof value === "object" ? JSON.stringify(value) : String(value ?? "") };
  }).filter((item) => item.label && (item.type === "vehicle-condition-map" || item.value));
  return {
    id: Number(raw.id),
    slug: String(raw.slug ?? raw.id),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    rootType: String(raw.root_type ?? ""),
    price: Number(raw.price ?? 0),
    currency: String(record(raw.currency).code ?? raw.currency_code ?? "AFN"),
    city: String(raw.city ?? selectedAreaName),
    district: String(raw.district ?? ""),
    conditionLabel: String(raw.condition ?? ""),
    isFeatured: Boolean(raw.is_featured),
    badges: [
      ...(raw.is_featured ? ["featured" as const] : []),
      ...(raw.is_urgent ? ["urgent" as const] : []),
      ...(raw.created_at && new Date(String(raw.created_at)).getTime() > Date.now() - 7 * 86400000 ? ["new" as const] : []),
    ],
    status: raw.status === "published" ? "active" : "draft",
    viewCount: Number(raw.view_count ?? 0),
    favoriteCount: Number(raw.favorite_count ?? 0),
    isFavorited: Boolean(raw.is_favorited),
    createdAt: String(
      raw.created_at ?? raw.published_at ?? new Date().toISOString(),
    ),
    categorySlug: String(category.slug ?? ""),
    categoryName: String(category.name ?? category.slug ?? ""),
    sellerName: String(owner.name ?? ""),
    ownerUserId: owner.id ? Number(owner.id) : undefined,
    sellerPhone: typeof owner.phone === "string" ? owner.phone : undefined,
    contactName: typeof raw.contact_name === "string" ? raw.contact_name : undefined,
    contactEmail: typeof raw.contact_email === "string" ? raw.contact_email : undefined,
    phoneVisible: Boolean(raw.phone_visible),
    images: media.map((media: RawListing, index: number) => ({
      url: mediaUrl(media.url ?? media.path),
      alt: String(media.alt_text ?? raw.title ?? ""),
      sortOrder: Number(media.sort_order ?? index + 1),
    })),
    attributes,
    // Public API location is approximate; intentionally exclude the private address.
    location: (() => {
      const location = record(raw.location);
      const latitude = Number(location.latitude ?? location.lat);
      const longitude = Number(location.longitude ?? location.lng);
      const hierarchy = areaHierarchy.length ? areaHierarchy : undefined;
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude, administrative_area: selectedAreaName || undefined, hierarchy }
        : hierarchy ? { administrative_area: selectedAreaName || undefined, hierarchy } : undefined;
    })(),
  };
}

async function request<T>(path: string, options: { fresh?: boolean } = {}): Promise<T> {
  const locale = await getLocale();
  const response = await fetch(`${env.apiUrl}${path}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": locale,
      "X-Malik-Locale": locale,
    },
    ...(options.fresh ? { cache: "no-store" as const } : { next: { revalidate: 30 } }),
  });
  if (!response.ok) throw new MarketplaceRequestError(response.status);
  return response.json() as Promise<T>;
}

export class LaravelMarketplaceRepository
  implements ListingRepository, CategoryRepository
{
  async list(): Promise<Category[]> {
    const response = await request<{ data: RawListing[] }>(
      routes.api.categories,
      { fresh: true },
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

  async filters(categoryId: number) {
    const response = await request<{ data: Array<{ code: string; label: string | null; data_type: string; input_type: string; is_filterable?: boolean; options: Array<{ value: string; slug: string; label: string | null }> }> }>(routes.api.categoryFilters(categoryId), { fresh: true });
    return response.data.filter((field) => field.is_filterable !== false);
  }

  async analyticsListings(path: string): Promise<Array<{ id: number; slug: string; title: string }>> {
    const response = await request<{ data: Array<{ id: number; slug: string; title: string }> }>(path, { fresh: true });
    return response.data;
  }

  async topSearched(rootType: string): Promise<Array<{ normalized_query: string; search_count: number }>> {
    const response = await request<{ data: Array<{ normalized_query: string; search_count: number }> }>(`/api/v1/analytics/top-searched/${rootType}`, { fresh: true });
    return response.data;
  }

  async search(filters: ListingFilters): Promise<Listing[]> {
    const page = await this.searchPage(filters);
    return page.items;
  }

  async searchPage(filters: ListingFilters): Promise<ListingPage> {
    const params = new URLSearchParams({ per_page: "50" });
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.city) params.set("city", filters.city);
    if (filters.minPrice !== undefined)
      params.set("min_price", String(filters.minPrice));
    if (filters.maxPrice !== undefined)
      params.set("max_price", String(filters.maxPrice));
    Object.entries(filters.attributes ?? {}).forEach(([code, value]) => params.set(`attributes[${code}]`, value));
    if (filters.page !== undefined) params.set("page", String(filters.page));
    if (filters.perPage !== undefined) params.set("per_page", String(filters.perPage));
    if (filters.featured !== undefined)
      params.set("featured", filters.featured ? "1" : "0");
    if (filters.sort === "price_asc") params.set("sort", "price_asc");
    if (filters.sort === "price_desc") params.set("sort", "price_desc");
    if (filters.sort === "popular") params.set("sort", "most_viewed");
    if (filters.sort === "most_viewed") params.set("sort", "most_viewed");
    if (filters.sort === "most_popular") params.set("sort", "most_popular");
    const response = await request<{
      data: RawListing[] | { data?: RawListing[]; current_page?: number; last_page?: number; total?: number; per_page?: number };
    }>(
      `${routes.api.listings}?${params}`,
      { fresh: true },
    );
    const paginated = Array.isArray(response.data) ? null : response.data;
    const items = paginated?.data ?? (Array.isArray(response.data) ? response.data : []);
    return { items: items.map(mapListing), currentPage: Number(paginated?.current_page ?? 1), lastPage: Number(paginated?.last_page ?? 1), total: Number(paginated?.total ?? items.length), perPage: Number(paginated?.per_page ?? items.length) };
  }

  async findBySlug(slug: string): Promise<Listing | null> {
    try {
      const response = await request<{ data: RawListing }>(
        routes.api.listingBySlug(slug),
        { fresh: true },
      );
      return mapListing(response.data);
    } catch (error) {
      if (error instanceof MarketplaceRequestError && error.status === 404) return null;
      throw error;
    }
  }

  async incrementViews(): Promise<void> {
    return Promise.resolve();
  }
}
