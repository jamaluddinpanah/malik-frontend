"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { LocateFixed } from "lucide-react";
import { LocationSelector, type LocationOption } from "@/features/catalog/location-selector";
import { ListingMapSurface, loadGoogleGeocoding, loadGooglePlaces, type MapCoordinates } from "./listing-map";
import styles from "./listing-map.module.css";

// Mapbox Search JS accesses `document` while loading, so it must not be
// evaluated during Next.js server rendering.
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((module) => module.SearchBox), { ssr: false });

export type ListingLocationValue = { address: string; administrativeAreaId: number | null; latitude: number | null; longitude: number | null };

function GooglePlaceSearch({ apiKey, locale, placeholder, onSelect, onError }: { apiKey: string; locale: string; placeholder: string; onSelect: (location: { address: string; latitude: number; longitude: number }) => void; onError: () => void }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
    const element = container.current;
    if (!element) return;

    const selectPlace = async (event: Event) => {
      const prediction = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction;
      const place = prediction.toPlace();
      try {
        await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
        if (cancelled || !place.location) return;
        onSelect({
          address: place.formattedAddress ?? place.displayName ?? placeholder,
          latitude: place.location.lat(),
          longitude: place.location.lng(),
        });
      } catch {
        if (!cancelled) onError();
      }
    };

    void loadGooglePlaces(apiKey).then(({ PlaceAutocompleteElement }) => {
      if (cancelled) return;
      autocomplete = new PlaceAutocompleteElement({ placeholder, requestedLanguage: locale, requestedRegion: "AF" });
      autocomplete.addEventListener("gmp-select", selectPlace);
      element.replaceChildren(autocomplete);
    }).catch(() => { if (!cancelled) onError(); });

    return () => {
      cancelled = true;
      autocomplete?.removeEventListener("gmp-select", selectPlace);
      element.replaceChildren();
    };
  }, [apiKey, locale, onError, onSelect, placeholder]);

  return <div className={styles.googlePlaceSearch} ref={container} />;
}

export function ListingLocationPicker({ value, onChange }: { value: ListingLocationValue; onChange: (value: ListingLocationValue) => void }) {
  const t = useTranslations("maps");
  const locale = useLocale();
  const [query, setQuery] = useState(value.address);
  const [error, setError] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [preferGoogle, setPreferGoogle] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchBoxKey, setSearchBoxKey] = useState(0);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const coordinates = value.latitude !== null && value.longitude !== null ? { latitude: value.latitude, longitude: value.longitude } : null;
  const updateCoordinates = (point: MapCoordinates) => onChange({ ...value, latitude: point.latitude, longitude: point.longitude });

  // The parent can restore a draft or reset the field without remounting this picker.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setQuery(value.address); }, [value.address]);

  function useCurrentLocation() {
    // Remounting clears any open Mapbox Search Box suggestions. The
    // reverse-geocoded text is then shown without starting a new search.
    setSearchBoxKey((key) => key + 1);
    if (!navigator.geolocation) {
      setError(t("currentLocationError"));
      return;
    }
    setError("");
    setAccuracy(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setAccuracy(Math.round(position.coords.accuracy));
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        try {
          setPreferGoogle(true);
          const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
          if (!key) throw new Error("Google unavailable");
          const { Geocoder } = await loadGoogleGeocoding(key);
          const result = await new Geocoder().geocode({ location: { lat: latitude, lng: longitude } });
          if (!result.results[0]?.formatted_address) throw new Error("No result");
          address = result.results[0].formatted_address;
        } catch {
          try {
            const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
            if (!mapboxToken) throw new Error("Mapbox unavailable");
            const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${longitude},${latitude}`)}.json?access_token=${encodeURIComponent(mapboxToken)}&limit=1`);
            const feature = (await response.json()).features?.[0];
            if (!response.ok || typeof feature?.place_name !== "string") throw new Error("No result");
            address = feature.place_name;
          } catch {
            // Keep coordinates in the address field when a reverse geocoder is unavailable.
          }
        }

        onChange({ ...value, address, latitude, longitude });
        setQuery(address);
        setLocating(false);
      },
      () => {
        setError(t("currentLocationError"));
        setLocating(false);
      },
      // Always ask the browser for a fresh sensor/Wi-Fi based reading. This does
      // not use IP geolocation, so a VPN cannot replace the device position.
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  return <section className={styles.picker} aria-labelledby="listing-location-title">
    <h3 id="listing-location-title">{t("title")}</h3>
    <p className={styles.hint}>{t("editorHint")}</p>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {accuracy !== null ? <p className={styles.hint}>{t("currentLocationAccuracy", { meters: accuracy })}</p> : null}
    <ListingMapSurface coordinates={coordinates} interactive preferGoogle={Boolean(googleKey) || preferGoogle} onCoordinatesChange={updateCoordinates} overlay={
      <div className={styles.mapSearch}>
        <div className={styles.search}>
          {googleKey ? <GooglePlaceSearch key={searchBoxKey} apiKey={googleKey} locale={locale} placeholder={t("searchPlaceholder")} onError={() => setError(t("searchError"))} onSelect={({ address, latitude, longitude }) => {
            setPreferGoogle(true);
            onChange({ ...value, address, latitude, longitude });
            setQuery(address);
          }} /> : mapboxToken ? <SearchBox key={searchBoxKey} accessToken={mapboxToken} value={query} onChange={setQuery} placeholder={t("searchPlaceholder")} options={{ language: locale, limit: 10, proximity: { lng: coordinates?.longitude ?? 69.2075, lat: coordinates?.latitude ?? 34.5553 } }} onRetrieve={(response) => {
            const feature = response.features[0];
            const longitude = Number(feature?.geometry?.coordinates?.[0]);
            const latitude = Number(feature?.geometry?.coordinates?.[1]);
            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              setError(t("searchError"));
              return;
            }
            const address = feature?.properties?.full_address ?? feature?.properties?.name ?? query;
            onChange({ ...value, address, latitude, longitude });
            setQuery(address);
          }} /> : <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} />}
          <button type="button" onClick={useCurrentLocation} disabled={locating}><LocateFixed size={16} /> {locating ? t("locating") : t("currentLocation")}</button>
        </div>
      </div>
    } />
    <div className={styles.fields}>
      <label>{t("latitude")}<input type="number" step="any" value={value.latitude ?? ""} readOnly /></label>
      <label>{t("longitude")}<input type="number" step="any" value={value.longitude ?? ""} readOnly /></label>
      <div className={`${styles.wide} ${styles.field}`}><span>{t("administrativeArea")}</span><LocationSelector value={value.administrativeAreaId ?? undefined} onChange={(area: LocationOption | null) => onChange({ ...value, administrativeAreaId: area?.id ?? null })} /></div>
      <label className={styles.wide}>{t("address")}<textarea value={value.address} onChange={(event) => { setQuery(event.target.value); onChange({ ...value, address: event.target.value }); }} /></label>
    </div>
  </section>;
}
