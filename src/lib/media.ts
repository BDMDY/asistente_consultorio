"use client";
import { useMemo } from "react";
import { defineStore } from "./store";

export interface Stat { id: number; n: string; l: string }
export interface Quote { id: number; t: string; a: string }
/** Doctor tal como lo ven la agenda, la reserva y el sitio: el nombre y el COP salen del usuario registrado (Configuración → Usuarios). */
export interface Doctor { id: number; name: string; spec: string; cop: string; photo: string }
/** Perfil público de un doctor registrado, enlazado por su número de agenda: lo que el usuario no tiene (título, especialidad y foto). */
export interface DoctorProfile { id: number; title?: string; spec: string; photo: string }
export interface Facility { id: number; cap: string; photo: string }
export interface BeforeAfter { id: number; label: string; before: string; after: string }
/** Catálogo único: lo editan el módulo Servicios y Medios de marca; lo usan landing, reserva y agenda. */
export interface Service { id: number; name: string; desc: string; price: string; /** minutos */ dur?: number; /** false = oculto en reserva y agenda */ on?: boolean }
export interface MediaImages { logoL?: string; logoD?: string; hero?: string; favicon?: string }

export interface Media {
  stats: Stat[];
  quotes: Quote[];
  img: MediaImages;
  docs: DoctorProfile[];
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
    { id: 1, title: "Dra.", spec: "Ortodoncista", photo: "" },
    { id: 2, title: "Dr.", spec: "Odontólogo general", photo: "" },
    { id: 3, title: "Dra.", spec: "Endodoncista", photo: "" },
  ],

  facs: [{ id: 1, cap: "Recepción", photo: "" }],
  cases: [{ id: 1, label: "Ortodoncia · 14 meses", before: "", after: "" }],
  services: [
    { id: 1, name: "Ortodoncia", desc: "Brackets y alineadores a tu medida.", price: "150", dur: 45 },
    { id: 2, name: "Limpieza dental", desc: "Profilaxis y control preventivo.", price: "90", dur: 30 },
    { id: 3, name: "Blanqueamiento", desc: "Resultados visibles en una sesión.", price: "350", dur: 60 },
    { id: 4, name: "Implantes", desc: "Recupera función y estética.", price: "1,800", dur: 90 },
  ],
};

export const mediaStore = defineStore<Partial<Media>>("da-media-v2", () => ({}), { remote: { name: "media", empty: () => ({}) } });

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

/** Duración en tramos de 15 min: la configurada en el servicio o, si falta, un valor por defecto según su posición. */
export const serviceSlots = (svc: Pick<Service, "dur"> | undefined, index = 0) => (svc?.dur ? Math.max(1, Math.round(svc.dur / 15)) : ([3, 2, 4, 6][index] ?? 3));

/** Servicios que se ofrecen (activos). */
export const activeServices = (m: Media) => m.services.filter((x) => x.on !== false);

export function parsePrice(price: string): number {
  const n = parseFloat(String(price).replace(/,/g, ""));
  return n > 0 ? n : NaN;
}


export const initials = (name: string) =>
  name.replace(/^(Dra?\.)\s*/, "").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
