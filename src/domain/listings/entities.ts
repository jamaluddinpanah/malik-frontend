export type ListingStatus = "draft" | "active" | "sold" | "expired" | "deleted";
export type ListingBadge = "featured" | "new" | "urgent";

export interface ListingImage { url: string; alt: string; sortOrder: number }
export interface Listing {
  id: number; slug: string; title: string; description: string; price: number;
  currency: string; city: string; district: string; conditionLabel: string;
  badge?: ListingBadge; isFeatured: boolean; status: ListingStatus; viewCount: number;
  createdAt: string; categorySlug: string; categoryName: string; sellerName: string;
  sellerPhone?: string; images: ListingImage[];
}
export interface Category { id: number; slug: string; name: string; parentSlug?: string; listingCount: number }
