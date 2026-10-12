import { getSite, letterFavicon } from "@/lib/backend/site-server";
import type { BrandConfig } from "@/lib/brand";

export const revalidate = 30;

/** Algunos navegadores piden /favicon.ico directamente: se redirige al ícono real de la clínica. */
export async function GET(req: Request) {
  const site = await getSite();
  const brand = (site?.brand as Partial<BrandConfig> | null) ?? {};
  const media = (site?.media as { img?: { favicon?: string } } | null) ?? {};
  const name = brand.name || site?.clinic?.name || "Clínica";
  const color = /^#[0-9a-f]{6}$/i.test(brand.hex ?? "") ? brand.hex! : "#00875A";
  const icon = media.img?.favicon || letterFavicon(name, color);
  if (icon.startsWith("data:image/svg+xml,")) {
    return new Response(decodeURIComponent(icon.slice("data:image/svg+xml,".length)), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" } });
  }
  return Response.redirect(new URL(icon, req.url), 307);
}
