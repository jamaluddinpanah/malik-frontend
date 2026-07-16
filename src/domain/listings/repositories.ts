import type { Category, Listing } from "./entities";
export interface ListingFilters { q?: string; category?: string; city?: string; minPrice?: number; maxPrice?: number; sort?: "newest" | "price_asc" | "price_desc" | "popular"; featured?: boolean }
export interface ListingRepository { search(filters: ListingFilters): Promise<Listing[]>; findBySlug(slug: string): Promise<Listing | null>; incrementViews(slug: string): Promise<void> }
export interface CategoryRepository { list(): Promise<Category[]> }
