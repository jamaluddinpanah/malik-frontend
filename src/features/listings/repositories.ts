import type { Category, Listing } from "./entities";
export interface ListingFilters { q?: string; category?: string; city?: string; minPrice?: number; maxPrice?: number; attributes?: Record<string, string>; sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "popular" | "most_viewed" | "most_popular"; featured?: boolean; page?: number; perPage?: number }
export type ListingPage = { items: Listing[]; currentPage: number; lastPage: number; total: number; perPage: number };
export interface ListingRepository { search(filters: ListingFilters): Promise<Listing[]>; searchPage?(filters: ListingFilters): Promise<ListingPage>; findBySlug(slug: string): Promise<Listing | null>; incrementViews(slug: string): Promise<void> }
export type CategoryFilter = { code: string; label: string | null; data_type: string; input_type: string; options: Array<{ value: string; slug: string; label: string | null }> };
export interface CategoryRepository { list(): Promise<Category[]>; filters?(categoryId: number): Promise<CategoryFilter[]> }
