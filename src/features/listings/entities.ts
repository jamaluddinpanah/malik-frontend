export type ListingStatus = "draft" | "active" | "sold" | "expired" | "deleted";
export type ListingBadge = "featured" | "new" | "urgent";
export type ListingAttribute =
  | { type: "text"; label: string; value: string }
  | {
      type: "vehicle-condition-map";
      label: string;
      value: Record<string, string>;
    };

export interface ListingImage { url: string; alt: string; sortOrder: number }
export interface Listing {
  id: number; slug: string; title: string; description: string; rootType: string; price: number;
  currency: string; city: string; district: string; conditionLabel: string;
  badges: ListingBadge[]; isFeatured: boolean; status: ListingStatus; viewCount: number;
  createdAt: string; categorySlug: string; categoryName: string; sellerName: string; ownerUserId?: number;
  sellerPhone?: string; contactName?: string; contactEmail?: string; phoneVisible?: boolean; images: ListingImage[]; favoriteCount?: number; isFavorited?: boolean; attributes?: ListingAttribute[];
  location?: { latitude?: number; longitude?: number; lat?: number; lng?: number; administrative_area?: string };
}
export interface Category { id: number; slug: string; name: string; parentSlug?: string; listingCount: number; icon?: string | null; default_expanded?: boolean }
