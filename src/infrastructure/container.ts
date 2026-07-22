import {
  GetListing,
  ListCategories,
  SearchListings,
} from "@/application/listings/use-cases";
import { LaravelMarketplaceRepository } from "./repositories/laravel-marketplace-repository";
const repository = new LaravelMarketplaceRepository();
export const marketplace = {
  searchListings: new SearchListings(repository),
  getListing: new GetListing(repository),
  listCategories: new ListCategories(repository),
};
