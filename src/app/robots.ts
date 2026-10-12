import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/intranet", "/clientes", "/mi-cita", "/mis-citas"] },
    ...(BASE ? { sitemap: `${BASE}/sitemap.xml` } : {}),
  };
}
