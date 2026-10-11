import { cache } from "react";
import { CLINIC_SLUG, SUPABASE_KEY, SUPABASE_URL, isRemote } from "./config";
import type { PublicSite } from "./sync";

/**
 * Marca y medios de la clínica leídos en el servidor (se renueva cada 30 s): así la página llega ya con el nombre, los colores,
 * el favicon y el título reales, sin pasar antes por los datos de ejemplo. Devuelve null en modo demo o si no responde.
 */
/** Último sitio bueno: si un refresco falla no se degrada la página a los datos genéricos. */
let lastGood: PublicSite | null = null;

export const getSite = cache(async (): Promise<PublicSite | null> => {
  if (!isRemote) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_site`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_slug: CLINIC_SLUG }),
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return lastGood;
    const site = (await r.json()) as PublicSite | null;
    if (site && site.clinic) lastGood = site;
    return lastGood;
  } catch {
    return lastGood;
  }
});

/** Favicon de reserva con el color y la inicial de la clínica (para que nunca aparezca el ícono de otro sitio). */
export function letterFavicon(name: string, color: string): string {
  const letter = (name.trim()[0] ?? "C").toUpperCase().replace(/[<>&"']/g, "C");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${color}"/><text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="#fff">${letter}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
