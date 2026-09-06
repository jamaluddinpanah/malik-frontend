"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiClient } from "@/shared/lib/api";
import { routes } from "@/shared/lib/routes";
import { loadGoogleMaps, loadGoogleMarkers } from "@/features/listings/listing-map";
import { ListingRow } from "@/features/listings/listing-row";
import type { Listing } from "@/features/listings/entities";
type MapPoint = { latitude: number; longitude: number; count: number; root_type: string };
type MapListing = { id: number; slug: string; title: string; description: string; root_type: string; price: number | null; currency?: { code?: string }; is_featured?: boolean; is_urgent?: boolean; is_favorited?: boolean; view_count?: number; created_at?: string; published_at?: string; media?: Array<{ url?: string; thumbnail_url?: string; sort_order?: number }>; administrative_area?: { name?: string; hierarchy?: Array<{ id?: number; type?: string; name?: string }> } };
function asListing(item: MapListing): Listing {
 const hierarchy = item.administrative_area?.hierarchy?.flatMap((area) => area.name ? [{ id: area.id, type: area.type, name: area.name }] : []) ?? [];
 const createdAt = item.published_at ?? item.created_at ?? new Date().toISOString();
 return {
  id: item.id, slug: item.slug, title: item.title, description: item.description || item.title, rootType: item.root_type,
  price: item.price ?? 0, currency: item.currency?.code ?? "AFN", city: item.administrative_area?.name ?? "", district: "", conditionLabel: "",
  badges: [
   ...(item.is_featured ? ["featured" as const] : []),
   ...(item.is_urgent ? ["urgent" as const] : []),
   ...(new Date(createdAt).getTime() > Date.now() - 7 * 86400000 ? ["new" as const] : []),
  ],
  isFeatured: Boolean(item.is_featured), status: "active", viewCount: item.view_count ?? 0, createdAt,
  categorySlug: "", categoryName: "", sellerName: "", isFavorited: Boolean(item.is_favorited),
  images: (item.media ?? []).map((media, index) => ({ url: media.thumbnail_url || media.url || "", alt: item.title, sortOrder: media.sort_order ?? index + 1 })).filter((media) => media.url),
  location: hierarchy.length ? { administrative_area: item.administrative_area?.name, hierarchy } : undefined,
 };
}
const icons: Record<string, string> = { real_estate: "⌂", vehicle: "🚗", goods: "🛍", job: "💼" };
export default function ListingsMapPage() {
 const element = useRef<HTMLDivElement>(null); const [error, setError] = useState(""); const [selected, setSelected] = useState<MapListing[] | null>(null); const t = useTranslations("maps"); const locale = useLocale(); const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
 useEffect(() => { if (!key || !element.current) { setError(t("unavailable")); return; } let cancelled = false; void Promise.all([apiClient.request<{ data: MapPoint[] }>(routes.api.listingsMap), loadGoogleMaps(key), loadGoogleMarkers(key)]).then(([response, { Map }, { AdvancedMarkerElement }]) => { if (cancelled || !element.current) return; const map = new Map(element.current, { center: { lat: 33.9391, lng: 67.7100 }, zoom: 6, mapTypeControl: false, streetViewControl: false, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID" }); response.data.forEach((point) => { const marker = document.createElement("button"); marker.type = "button"; marker.title = point.count + " active listings"; marker.textContent = (icons[point.root_type] ?? "●") + " " + point.count; marker.style.cssText = "background:#17365d;border:2px solid #fff;border-radius:999px;color:#fff;cursor:pointer;font-weight:700;padding:8px 11px;box-shadow:0 2px 8px #0005"; const advancedMarker = new AdvancedMarkerElement({ map, position: { lat: point.latitude, lng: point.longitude }, content: marker, title: marker.title }); advancedMarker.addListener("gmp-click", () => void apiClient.request<{ data: MapListing[] }>(routes.api.listingsMapItems(point.latitude, point.longitude)).then((result) => setSelected(result.data)).catch(() => setError(t("publicLoadError")))); }); }).catch(() => { if (!cancelled) setError(t("publicLoadError")); }); return () => { cancelled = true; }; }, [key, t]);
 const rtl = locale !== "en";
 return <><main className="shell" style={{ paddingBlock: 32 }}><h1>{t("publicTitle")}</h1><p>{t("publicDescription")}</p>{error ? <p role="alert">{error}</p> : <div ref={element} style={{ height: "70vh", minHeight: 480, borderRadius: 12, overflow: "hidden" }} />}</main>{selected ? <aside aria-label="Listings at this location" style={{ animation: rtl ? "map-drawer-in-right .24s ease-out" : "map-drawer-in-left .24s ease-out", background: "#f3f7fa", bottom: 12, boxShadow: "0 0 24px #0003", display: "flex", flexDirection: "column", gap: 10, insetInlineStart: "50%", maxHeight: "min(52vh, 560px)", overflowY: "auto", padding: 10, position: "fixed", transform: "translateX(-50%)", width: "min(1056px, calc(100vw - 24px))", zIndex: 100 }}><div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", padding: "2px 4px" }}><h2 style={{ fontSize: 18, margin: 0 }}>{t("publicTitle")}</h2><button type="button" onClick={() => setSelected(null)} aria-label="Close listings" style={{ background: "#eef3f8", border: 0, borderRadius: "50%", color: "#17365d", cursor: "pointer", fontSize: 24, height: 32, lineHeight: 1, padding: 0, width: 32 }}>×</button></div><div className="row-list">{selected.map((item) => <ListingRow key={item.id} listing={asListing(item)} />)}</div></aside> : null}</>;
}
