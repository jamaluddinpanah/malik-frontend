import { GetListing, ListCategories, SearchListings } from "@/application/listings/use-cases";
import { InMemoryMarketplaceRepository } from "./repositories/in-memory-marketplace-repository";
const repository = new InMemoryMarketplaceRepository();
export const marketplace = { searchListings: new SearchListings(repository), getListing: new GetListing(repository), listCategories: new ListCategories(repository) };
