import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: [{ userAgent: "*", allow: "/", disallow: ["/account", "/admin", "/my-account", "/messages", "/login", "/register", "/sign-in", "/sign-up", "/verify-email", "/forbidden", "/unauthorized", "/search"] }], sitemap: "/sitemap.xml" }; }
