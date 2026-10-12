import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

export default function sitemap(): MetadataRoute.Sitemap {
  if (!BASE) return [];
  return ["", "/reserva", "/privacidad"].map((p) => ({ url: `${BASE}${p}`, changeFrequency: "weekly" as const }));
}
