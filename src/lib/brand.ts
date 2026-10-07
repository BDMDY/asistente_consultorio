"use client";
import { useMemo } from "react";
import { type BrandVars, deriveAccent, deriveBrand } from "./color";
import { defineStore } from "./store";

export interface BrandConfig {
  hex: string;
  accent: string;
  name: string;
  slogan: string;
  /** Tipografía predefinida: 0 Plus Jakarta Sans · 1 Inter + Lora · 2 DM Sans + Source Serif 4 */
  f: number;
  kicker: string;
  heroSub: string;
  servicesTitle: string;
  teamTitle: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  facebook: string;
  hours: string;
}

export const DEFAULT_BRAND: BrandConfig = {
  hex: "#00A86B",
  accent: "#F5A524",
  name: "Clínica Sonríe",
  slogan: "Sonrisas que cuidamos contigo",
  f: 0,
  kicker: "ORTODONCIA · ODONTOLOGÍA · LIMA",
  heroSub: "Atención cálida y tecnología moderna. Reserva en menos de un minuto, sin llamadas.",
  servicesTitle: "Nuestros servicios",
  teamTitle: "Nuestro equipo",
  address: "Av. Larco 345, Miraflores, Lima",
  phone: "+51 1 555 0123",
  whatsapp: "+51 987 654 321",
  email: "hola@clinicasonrie.pe",
  instagram: "@clinicasonrie",
  facebook: "/clinicasonrie",
  hours: "Lun–Vie 9:00–19:00 · Sáb 9:00–13:00",
};

const HEAD_FONTS = ["'Plus Jakarta Sans',sans-serif", "'Lora',serif", "'Source Serif 4',serif"];
const BODY_FONTS = ["'Plus Jakarta Sans',sans-serif", "'Inter',sans-serif", "'DM Sans',sans-serif"];

export const brandStore = defineStore<Partial<BrandConfig>>("da-brand-v1", () => ({}));

export interface ResolvedBrand extends BrandConfig {
  vars: BrandVars;
  waLink: string;
  telLink: string;
  head: string;
  body: string;
}

export function resolveBrand(partial: Partial<BrandConfig>): ResolvedBrand {
  const b: BrandConfig = { ...DEFAULT_BRAND, ...partial };
  const vars: BrandVars = b.hex.toUpperCase() === DEFAULT_BRAND.hex ? {} : deriveBrand(b.hex);
  if (b.accent && b.accent.toUpperCase() !== DEFAULT_BRAND.accent) Object.assign(vars, deriveAccent(b.accent));
  return {
    ...b,
    vars,
    waLink: "https://wa.me/" + String(b.whatsapp || "").replace(/\D/g, ""),
    telLink: "tel:" + String(b.phone || "").replace(/[^\d+]/g, ""),
    head: HEAD_FONTS[b.f] ?? HEAD_FONTS[0],
    body: BODY_FONTS[b.f] ?? BODY_FONTS[0],
  };
}

export function useBrand(): ResolvedBrand {
  const [partial] = brandStore.useStore();
  return useMemo(() => resolveBrand(partial), [partial]);
}

/** Variante azul de ejemplo del landing (demostración white-label). */
export const AZUL_DEMO = { name: "Dental Norte", kicker: "ODONTOLOGÍA INTEGRAL · LIMA", vars: deriveBrand("#2F6FDE") };
