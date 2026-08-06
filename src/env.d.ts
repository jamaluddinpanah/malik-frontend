declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_MAP_PROVIDER?: "mapbox" | "google";
    NEXT_PUBLIC_MAPBOX_TOKEN?: string;
    NEXT_PUBLIC_MAPBOX_STYLE?: string;
    NEXT_PUBLIC_GOOGLE_MAPS_KEY?: string;
  }
}
