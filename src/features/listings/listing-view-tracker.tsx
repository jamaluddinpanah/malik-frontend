"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";

export function ListingViewTracker({ listingId }: { listingId: number }) {
  const router = useRouter();
  useEffect(() => {
    void apiClient.request(routes.api.listingView(listingId), { method: "POST" }).then(() => router.refresh()).catch(() => undefined);
  }, [listingId, router]);

  return null;
}
