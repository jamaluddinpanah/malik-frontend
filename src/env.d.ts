declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_MAP_PROVIDER?: "mapbox" | "google";
    NEXT_PUBLIC_MAPBOX_TOKEN?: string;
    NEXT_PUBLIC_MAPBOX_STYLE?: string;
    NEXT_PUBLIC_GOOGLE_MAPS_KEY?: string;
    NEXT_PUBLIC_GOOGLE_MAP_ID?: string;
    NEXT_PUBLIC_REVERB_APP_KEY?: string;
    NEXT_PUBLIC_REVERB_HOST?: string;
    NEXT_PUBLIC_REVERB_PORT?: string;
    NEXT_PUBLIC_REVERB_SCHEME?: "http" | "https";
  }
}
