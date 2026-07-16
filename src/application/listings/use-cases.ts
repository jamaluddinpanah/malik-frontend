import type { CategoryRepository, ListingFilters, ListingRepository } from "@/domain/listings/repositories";
export class SearchListings { constructor(private readonly listings: ListingRepository) {} execute(filters: ListingFilters) { return this.listings.search(filters); } }
export class GetListing { constructor(private readonly listings: ListingRepository) {} async execute(slug: string) { const listing = await this.listings.findBySlug(slug); if (listing) await this.listings.incrementViews(slug); return listing; } }
export class ListCategories { constructor(private readonly categories: CategoryRepository) {} execute() { return this.categories.list(); } }
