"use client";
import { useMemo } from "react";
import { defineStore } from "./store";

export interface Stat { id: number; n: string; l: string }
export interface Quote { id: number; t: string; a: string }
export interface Doctor { id: number; name: string; spec: string; cop: string; photo: string }
export interface Facility { id: number; cap: string; photo: string }
export interface BeforeAfter { id: number; label: string; before: string; after: string }
export interface Service { id: number; name: string; desc: string; price: string }
export interface MediaImages { logoL?: string; logoD?: string; hero?: string; favicon?: string }

export interface Media {
  stats: Stat[];
  quotes: Quote[];
  img: MediaImages;
  docs: Doctor[];
  facs: Facility[];
  cases: BeforeAfter[];
  services: Service[];
}

export const DEFAULT_MEDIA: Media = {
  stats: [
    { id: 1, n: "12+", l: "años de experiencia" },
    { id: 2, n: "3,200", l: "pacientes atendidos" },
    { id: 3, n: "4.9", l: "valoración promedio" },
    { id: 4, n: "98%", l: "recomiendan la clínica" },
  ],
  quotes: [
    { id: 1, t: "Me explicaron todo el tratamiento y reservé desde mi celular. Excelente atención.", a: "Lucía R. · Ortodoncia" },
    { id: 2, t: "Puntuales, limpios y muy amables con mi hijo. Lo recomiendo.", a: "Marco T. · Odontopediatría" },
  ],
  img: {},
  docs: [
    { id: 1, name: "Dra. Ana Quispe", spec: "Ortodoncista", cop: "12345", photo: "" },
    { id: 2, name: "Dr. Luis Paredes", spec: "Odontólogo general", cop: "23456", photo: "" },
    { id: 3, name: "Dra. Carla Vega", spec: "Endodoncista", cop: "34567", photo: "" },
  ],
  facs: [{ id: 1, cap: "Recepción", photo: "" }],
  cases: [{ id: 1, label: "Ortodoncia · 14 meses", before: "", after: "" }],
  services: [
    { id: 1, name: "Ortodoncia", desc: "Brackets y alineadores a tu medida.", price: "150" },
    { id: 2, name: "Limpieza dental", desc: "Profilaxis y control preventivo.", price: "90" },
    { id: 3, name: "Blanqueamiento", desc: "Resultados visibles en una sesión.", price: "350" },
    { id: 4, name: "Implantes", desc: "Recupera función y estética.", price: "1,800" },
  ],
};

export const mediaStore = defineStore<Partial<Media>>("da-media-v2", () => ({}));

export function resolveMedia(p: Partial<Media>): Media {
  return {
    stats: p.stats ?? DEFAULT_MEDIA.stats,
    quotes: p.quotes ?? DEFAULT_MEDIA.quotes,
    img: p.img ?? {},
    docs: p.docs ?? DEFAULT_MEDIA.docs,
    facs: p.facs ?? DEFAULT_MEDIA.facs,
    cases: p.cases ?? DEFAULT_MEDIA.cases,
    services: p.services ?? DEFAULT_MEDIA.services,
  };
}

export function useMedia(): Media {
  const [p] = mediaStore.useStore();
  return useMemo(() => resolveMedia(p), [p]);
}

/** Duración por defecto (en tramos de 15 min) según la posición del servicio en la lista. */
export const serviceDuration = (i: number) => [3, 2, 4, 6][i] ?? 3;

export function parsePrice(price: string): number {
  const n = parseFloat(String(price).replace(/,/g, ""));
  return n > 0 ? n : NaN;
}

/** Doctores con respaldo a la lista por defecto, como en el prototipo (siempre al menos uno). */
export const doctorsOf = (m: Media) => (m.docs.length ? m.docs : DEFAULT_MEDIA.docs);

export const initials = (name: string) =>
  name.replace(/^(Dra?\.)\s*/, "").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
