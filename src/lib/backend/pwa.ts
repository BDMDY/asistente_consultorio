import { getSite } from "./site-server";
import type { BrandConfig } from "@/lib/brand";

/** Datos de la clínica para la app instalable (manifest e íconos). */
export async function pwaBrand() {
  const site = await getSite();
  const brand = (site?.brand as Partial<BrandConfig> | null) ?? {};
  const media = (site?.media as { img?: { favicon?: string; logoL?: string } } | null) ?? {};
  const name = brand.name || site?.clinic?.name || "DentAssist";
  const color = /^#[0-9a-f]{6}$/i.test(brand.hex ?? "") ? brand.hex! : "#00875A";
  return { name, color, icon: media.img?.favicon || "", slogan: brand.slogan || brand.heroSub || "" };
}
