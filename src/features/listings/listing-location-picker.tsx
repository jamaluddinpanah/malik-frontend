"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LocationSelector, type LocationOption } from "@/features/catalog/location-selector";
import { ListingMapSurface, loadGoogleGeocoding, type MapCoordinates } from "./listing-map";
import styles from "./listing-map.module.css";

export type ListingLocationValue = { address: string; administrativeAreaId: number | null; latitude: number | null; longitude: number | null };

export function ListingLocationPicker({ value, onChange }: { value: ListingLocationValue; onChange: (value: ListingLocationValue) => void }) {
  const t = useTranslations("maps");
  const [query, setQuery] = useState(value.address);
  const [error, setError] = useState("");
  const [preferGoogle, setPreferGoogle] = useState(false);
  const coordinates = value.latitude !== null && value.longitude !== null ? { latitude: value.latitude, longitude: value.longitude } : null;
  const updateCoordinates = (point: MapCoordinates) => onChange({ ...value, latitude: point.latitude, longitude: point.longitude });

  useEffect(() => { setQuery(value.address); }, [value.address]);

  async function search() {
    setError("");
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    try {
      if (!mapboxToken) throw new Error("Mapbox unavailable");
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1`);
      if (!response.ok) throw new Error("Mapbox geocoding failed");
      const feature = (await response.json()).features?.[0];
      if (!Array.isArray(feature?.center)) throw new Error("No result");
      onChange({ ...value, address: feature.place_name ?? query, longitude: Number(feature.center[0]), latitude: Number(feature.center[1]) });
      setQuery(feature.place_name ?? query);
      return;
    } catch {
      try {
        setPreferGoogle(true);
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
        if (!key) throw new Error("Google unavailable");
        const { Geocoder } = await loadGoogleGeocoding(key);
        const result = await new Geocoder().geocode({ address: query });
        const found = result.results[0];
        if (!found) throw new Error("No result");
        onChange({ ...value, address: found.formatted_address, latitude: found.geometry.location.lat(), longitude: found.geometry.location.lng() });
        setQuery(found.formatted_address);
      } catch { setError(t("searchError")); }
    }
  }

  return <section className={styles.picker} aria-labelledby="listing-location-title">
    <h3 id="listing-location-title">{t("title")}</h3>
    <p className={styles.hint}>{t("editorHint")}</p>
    <div className={styles.search}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} /><button type="button" onClick={() => void search()}>{t("search")}</button></div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <ListingMapSurface coordinates={coordinates} interactive preferGoogle={preferGoogle} onCoordinatesChange={updateCoordinates} />
    <div className={styles.fields}>
      <label className={styles.wide}>{t("address")}<textarea value={value.address} onChange={(event) => { setQuery(event.target.value); onChange({ ...value, address: event.target.value }); }} /></label>
      <label>{t("administrativeArea")}<LocationSelector value={value.administrativeAreaId ?? undefined} onChange={(area: LocationOption) => onChange({ ...value, administrativeAreaId: area.id })} /></label>
      <label>{t("latitude")}<input type="number" step="any" value={value.latitude ?? ""} onChange={(event) => onChange({ ...value, latitude: event.target.value === "" ? null : Number(event.target.value) })} /></label>
      <label>{t("longitude")}<input type="number" step="any" value={value.longitude ?? ""} onChange={(event) => onChange({ ...value, longitude: event.target.value === "" ? null : Number(event.target.value) })} /></label>
    </div>
  </section>;
}
