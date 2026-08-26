"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import styles from "./listing-map.module.css";

export type MapCoordinates = { latitude: number; longitude: number };

type MapSurfaceProps = {
  coordinates: MapCoordinates | null;
  interactive?: boolean;
  preferGoogle?: boolean;
  onCoordinatesChange?: (coordinates: MapCoordinates) => void;
  onProviderChange?: (provider: "mapbox" | "google" | null) => void;
  overlay?: ReactNode;
};

const defaultCenter: MapCoordinates = { latitude: 34.5553, longitude: 69.2075 };
const isCoordinate = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
let configuredGoogleKey: string | null = null;

export async function loadGoogleGeocoding(key: string) {
  if (!configuredGoogleKey) {
    setOptions({ key, v: "weekly" });
    configuredGoogleKey = key;
  }
  return importLibrary("geocoding");
}

export async function loadGooglePlaces(key: string) {
  if (!configuredGoogleKey) {
    setOptions({ key, v: "weekly" });
    configuredGoogleKey = key;
  }
  return importLibrary("places");
}

async function loadGoogleMaps(key: string) {
  if (!configuredGoogleKey) {
    setOptions({ key, v: "weekly" });
    configuredGoogleKey = key;
  }
  return importLibrary("maps");
}

async function loadGoogleMarkers(key: string) {
  if (!configuredGoogleKey) {
    setOptions({ key, v: "weekly" });
    configuredGoogleKey = key;
  }
  return importLibrary("marker");
}

export function ListingMapSurface({ coordinates, interactive = false, preferGoogle = false, onCoordinatesChange, onProviderChange, overlay }: MapSurfaceProps) {
  const t = useTranslations("maps");
  const element = useRef<HTMLDivElement>(null);
  const [provider, setProvider] = useState<"mapbox" | "google" | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  // A configured Google key makes Google Maps the primary provider throughout
  // the site. Mapbox is retained solely as a graceful fallback for failed
  // Google loads (or when no Google key has been configured).
  const preferred = googleKey || preferGoogle ? "google" : "mapbox";

  useEffect(() => {
    if (!element.current) return;
    let disposed = false;
    let mapboxMap: { remove: () => void } | undefined;
    let googleMarker: google.maps.marker.AdvancedMarkerElement | undefined;
    const center = coordinates ?? defaultCenter;
    const setActive = (next: "mapbox" | "google" | null) => {
      if (!disposed) {
        setProvider(next);
        onProviderChange?.(next);
      }
    };
    const emit = (latitude: number, longitude: number) => onCoordinatesChange?.({ latitude, longitude });

    async function loadGoogle() {
      if (!googleKey || !element.current) throw new Error("Google Maps is not configured.");
      const [, { AdvancedMarkerElement }] = await Promise.all([loadGoogleMaps(googleKey), loadGoogleMarkers(googleKey)]);
      if (disposed || !element.current) return;
      const point = { lat: center.latitude, lng: center.longitude };
      const map = new google.maps.Map(element.current, {
        center: point,
        zoom: coordinates ? 13 : 6,
        gestureHandling: "cooperative",
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
        mapTypeControl: false,
        streetViewControl: false,
      });
      googleMarker = new AdvancedMarkerElement({ map, position: coordinates ? point : undefined, gmpDraggable: interactive });
      if (interactive) {
        map.addListener("click", (event: google.maps.MapMouseEvent) => event.latLng && emit(event.latLng.lat(), event.latLng.lng()));
        googleMarker.addListener("dragend", () => {
          const position = googleMarker?.position;
          if (!position) return;
          const latitude = typeof position.lat === "function" ? position.lat() : position.lat;
          const longitude = typeof position.lng === "function" ? position.lng() : position.lng;
          emit(latitude, longitude);
        });
      }
      setActive("google");
    }

    async function loadMapbox() {
      if (!mapboxToken || !element.current) throw new Error("Mapbox is not configured.");
      const mapboxgl = (await import("mapbox-gl")).default;
      if (disposed || !element.current) return;
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({ container: element.current, style: process.env.NEXT_PUBLIC_MAPBOX_STYLE || "mapbox://styles/mapbox/streets-v12", center: [center.longitude, center.latitude], zoom: coordinates ? 13 : 6 });
      mapboxMap = map;
      const marker = new mapboxgl.Marker({ draggable: interactive });
      if (coordinates) marker.setLngLat([coordinates.longitude, coordinates.latitude]).addTo(map);
      if (interactive) {
        map.on("click", (event) => emit(event.lngLat.lat, event.lngLat.lng));
        marker.on("dragend", () => { const point = marker.getLngLat(); emit(point.lat, point.lng); });
      }
      map.once("load", () => setActive("mapbox"));
      map.once("error", () => { map.remove(); void loadGoogle().catch(() => setActive(null)); });
    }

    const primary = preferred === "google" ? loadGoogle : loadMapbox;
    const fallback = preferred === "google" ? loadMapbox : loadGoogle;
    void primary().catch(() => fallback().catch(() => setActive(null)));
    return () => { disposed = true; if (googleMarker) googleMarker.map = null; mapboxMap?.remove(); };
  // Maps are recreated only when the configured provider or selected point changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates?.latitude, coordinates?.longitude, googleKey, mapboxToken, preferred]);

  if (!mapboxToken && !googleKey) return <div className={styles.fallback}>{t("unavailable")}</div>;
  return (
    <div className={styles.mapWrapper}>
      <div className={styles.map} ref={element} aria-label={t("mapLabel")} role="application" />
      {provider === null ? <div className={styles.loading}>{t("loading")}</div> : null}
      {overlay}
    </div>
  );
}

export function ListingMap({ location }: { location: unknown }) {
  const t = useTranslations("maps");
  const record = location && typeof location === "object" ? location as Record<string, unknown> : {};
  const latitude = Number(record.latitude ?? record.lat);
  const longitude = Number(record.longitude ?? record.lng);
  const coordinates = isCoordinate(latitude) && isCoordinate(longitude) ? { latitude, longitude } : null;
  if (!coordinates) return <div className={styles.fallback}>{t("noPublicLocation")}</div>;
  return <ListingMapSurface coordinates={coordinates} />;
}
