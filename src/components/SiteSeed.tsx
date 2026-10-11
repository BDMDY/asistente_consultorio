"use client";
import { seedPublic, type PublicSite } from "@/lib/backend/sync";
import { registerSpecs } from "@/lib/backend/specs";

/** Carga en los stores la marca y los medios traídos por el servidor, antes de pintar. */
export default function SiteSeed({ site }: { site: PublicSite | null }) {
  if (site) {
    registerSpecs();
    seedPublic(site);
  }
  return null;
}
