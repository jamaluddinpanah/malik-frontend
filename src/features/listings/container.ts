import {
  GetListing,
  ListCategories,
  SearchListings,
  SearchListingsPage,
  ListCategoryFilters,
} from "@/features/listings/use-cases";
import { LaravelMarketplaceRepository } from "./laravel-marketplace-repository";
const repository = new LaravelMarketplaceRepository();
export const marketplace = {
  searchListings: new SearchListings(repository),
  searchListingsPage: new SearchListingsPage(repository),
  getListing: new GetListing(repository),
  listCategories: new ListCategories(repository),
  listCategoryFilters: new ListCategoryFilters(repository),
  analytics: { mostViewed: () => repository.analyticsListings("/api/v1/analytics/most-viewed"), mostPopular: () => repository.analyticsListings("/api/v1/analytics/most-popular"), topSearched: (rootType: string) => repository.topSearched(rootType) },
};
