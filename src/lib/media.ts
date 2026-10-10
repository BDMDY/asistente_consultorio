"use client";
import { useMemo } from "react";
import { defineStore } from "./store";

export interface Stat { id: number; n: string; l: string }
export interface Quote { id: number; t: string; a: string }
/** Doctor tal como lo ven la agenda, la reserva y el sitio: el nombre y el COP salen del usuario registrado (Configuración → Usuarios). */
export interface Doctor { id: number; name: string; /** nombre completo con tratamiento (historia clínica) */ full: string; spec: string; cop: string; photo: string }
/** Perfil público de un doctor registrado, enlazado por su número de agenda: lo que el usuario no tiene (título, especialidad y foto). */
export interface DoctorProfile { id: number; title?: string; spec: string; photo: string }
export interface Facility { id: number; cap: string; photo: string }
export interface BeforeAfter { id: number; label: string; before: string; after: string }
/** Catálogo único: lo editan el módulo Servicios y Medios de marca; lo usan landing, reserva y agenda. */
export interface Service { id: number; name: string; /** código para organizar el catálogo (ej. TRT-012) */ code?: string; desc: string; price: string; /** sesiones del tratamiento: el precio es el total y cada sesión vale precio ÷ sesiones (1 si falta) */ sessions?: number; /** pago inicial (S/), parte del precio total que se cobra al empezar; las sesiones valen (precio − inicial) ÷ sesiones */ initial?: number; /** minutos */ dur?: number; /** false = oculto en reserva y agenda */ on?: boolean; /** false = solo uso interno: no se muestra en el sitio ni en la reserva web (sí en agenda, planes y cobros) */ web?: boolean }
export interface MediaImages { logoL?: string; logoD?: string; hero?: string; favicon?: string }

/** Diapositiva del hero: foto, video en bucle (enlace .mp4/.webm) o animación incluida. */
export interface HeroSlide { id: number; kind: "image" | "video" | "anim"; /** foto (data URL) o enlace del video */ src?: string; anim?: "ondas" | "burbujas" | "destellos"; /** segundos que se muestra antes de pasar a la siguiente (por defecto 6,5 s; 14 s en video) */ secs?: number }
export const HERO_SECS_MIN = 2;
export const HERO_SECS_MAX = 60;
/** Segundos que permanece una diapositiva: el configurado o el valor por defecto de su tipo. */
export const heroSlideSecs = (sl: Pick<HeroSlide, "kind" | "secs"> | undefined) => {
  const d = sl?.kind === "video" ? 14 : 6.5;
  const n = Number(sl?.secs);
  return Number.isFinite(n) && n > 0 ? Math.min(HERO_SECS_MAX, Math.max(HERO_SECS_MIN, n)) : d;
};
export const HERO_ANIMS: [NonNullable<HeroSlide["anim"]>, string][] = [["ondas", "Ondas suaves"], ["burbujas", "Burbujas"], ["destellos", "Destellos"]];
export const MAX_HERO_SLIDES = 6;

/** ¿Es un enlace de video que el navegador puede reproducir (https, .mp4/.webm/.ogg)? */
export const isVideoUrl = (u: string) => /^https:\/\/[^\s]+\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(u.trim());

/** Banner del sitio (reemplaza a la franja de cifras): imagen ancha, imagen opcional para móvil y enlace opcional. */
export interface SiteBanner { on?: boolean; img?: string; imgMobile?: string; /** enlace: https://… o una ruta del sitio (/reserva) */ link?: string; alt?: string; /** mostrar además la franja de cifras (apagada por defecto) */ showStats?: boolean }
/** Enlace permitido para el banner: https o una ruta interna; cualquier otra cosa se descarta. */
export const bannerHref = (v: string | undefined) => { const t = (v ?? "").trim(); return /^https?:\/\//i.test(t) || /^\/(?!\/)/.test(t) ? t : ""; };

export interface Media {
  banner: SiteBanner;
  /** diapositivas del hero (carrusel); vacío = la foto hero o un fondo de color */
  hero: HeroSlide[];
  stats: Stat[];
  quotes: Quote[];
  img: MediaImages;
  docs: DoctorProfile[];
  facs: Facility[];
  cases: BeforeAfter[];
  services: Service[];
}

export const DEFAULT_MEDIA: Media = {
  banner: {},
  hero: [],
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
    { id: 1, name: "Ortodoncia", desc: "Brackets y alineadores a tu medida.", price: "1,800", sessions: 12, dur: 45 },
    { id: 2, name: "Limpieza dental", desc: "Profilaxis y control preventivo.", price: "90", sessions: 1, dur: 30 },
    { id: 3, name: "Blanqueamiento", desc: "Resultados visibles en una sesión.", price: "350", sessions: 1, dur: 60 },
    { id: 4, name: "Implantes", desc: "Recupera función y estética.", price: "1,800", sessions: 3, dur: 90 },
  ],
};

export const mediaStore = defineStore<Partial<Media>>("da-media-v2", () => ({}), { remote: { name: "media", empty: () => ({}) } });

export function resolveMedia(p: Partial<Media>): Media {
  return {
    hero: p.hero ?? [],
    banner: p.banner ?? {},
    stats: p.stats ?? DEFAULT_MEDIA.stats,
    quotes: p.quotes ?? DEFAULT_MEDIA.quotes,
    img: p.img ?? {},
    docs: p.docs ?? DEFAULT_MEDIA.docs,
    facs: p.facs ?? DEFAULT_MEDIA.facs,
    cases: p.cases ?? DEFAULT_MEDIA.cases,
    services: withCodes(p.services ?? DEFAULT_MEDIA.services),
  };
}

const CODE_RE = /^TRT-(\d+)$/;
/** Siguiente código libre del catálogo: TRT-001, TRT-002… */
export function nextServiceCode(list: Pick<Service, "code">[], taken: string[] = []): string {
  const used = [...list.map((s) => s.code ?? ""), ...taken];
  const max = used.reduce((n, c) => Math.max(n, Number(CODE_RE.exec(c)?.[1] ?? 0)), 0);
  return "TRT-" + String(max + 1).padStart(3, "0");
}

/** Asigna código a los servicios que aún no lo tienen (en el orden del catálogo). */
export function withCodes(list: Service[]): Service[] {
  if (list.every((s) => s.code)) return list;
  const out: Service[] = [];
  for (const s of list) out.push(s.code ? s : { ...s, code: nextServiceCode([...list, ...out]) });
  return out;
}

export function useMedia(): Media {
  const [p] = mediaStore.useStore();
  return useMemo(() => resolveMedia(p), [p]);
}

/** Duración en tramos de 15 min: la configurada en el servicio o, si falta, un valor por defecto según su posición. */
export const serviceSlots = (svc: Pick<Service, "dur"> | undefined, index = 0) => (svc?.dur ? Math.max(1, Math.round(svc.dur / 15)) : ([3, 2, 4, 6][index] ?? 3));

/** Servicios que se ofrecen (activos). */
export const activeServices = (m: Media) => m.services.filter((x) => x.on !== false);
/** Servicios que el paciente ve en el sitio y en la reserva web. */
export const webServices = (m: Media) => m.services.filter((x) => x.on !== false && x.web !== false);

/** Número de sesiones asignado al tratamiento (mínimo 1). */
export const serviceSessions = (s: Pick<Service, "sessions">) => Math.max(1, Math.round(s.sessions ?? 1) || 1);

/** Valor de una sesión: precio total del tratamiento ÷ número de sesiones (NaN si no tiene precio). */
export const sessionValue = (s: Pick<Service, "price" | "sessions" | "initial">) => {
  const t = parsePrice(s.price);
  return t > 0 ? Math.round((Math.max(0, t - (s.initial ?? 0)) / serviceSessions(s)) * 100) / 100 : NaN;
};

export function parsePrice(price: string): number {
  const n = parseFloat(String(price).replace(/,/g, ""));
  return n > 0 ? n : NaN;
}


export const initials = (name: string) =>
  name.replace(/^(Dra?\.)\s*/, "").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

/** Diapositivas que se muestran en el hero: las del carrusel o, si no hay, la foto hero. */
export const heroSlides = (m: Media): HeroSlide[] => (m.hero.length ? m.hero : m.img.hero ? [{ id: 0, kind: "image", src: m.img.hero }] : []);
