/**
 * Browser-safe runtime configuration. Only NEXT_PUBLIC_* values may be read
 * here; secrets belong to Laravel or the deployment platform, never Next.js.
 */
function requiredPublicUrl(value: string | undefined, fallback: string): string {
  const candidate = (value ?? fallback).trim().replace(/\/$/, "");

  try {
    return new URL(candidate).origin;
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL.");
  }
}

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Malik",
  apiUrl: requiredPublicUrl(process.env.NEXT_PUBLIC_API_URL, "http://localhost:8000"),
  reverbKey: process.env.NEXT_PUBLIC_REVERB_APP_KEY?.trim() || "",
  reverbHost: process.env.NEXT_PUBLIC_REVERB_HOST?.trim() || "localhost",
  reverbPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
  reverbScheme: process.env.NEXT_PUBLIC_REVERB_SCHEME === "https" ? "https" : "http",
} as const;
