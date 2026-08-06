import type { MetadataRoute } from "next";
import { locales } from "@/shared/i18n/config";

const routes = ["", "/about", "/terms", "/privacy", "/safety", "/contact", "/real-estate", "/listings"];
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return locales.flatMap((locale) => routes.map((path) => ({ url: `${base}/${locale}${path}`, lastModified: new Date(), changeFrequency: path ? "weekly" : "daily", priority: path ? 0.6 : 1 })));
}
