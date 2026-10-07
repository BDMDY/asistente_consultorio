import type { MsgSeg } from "./mod";

export type SegType = MsgSeg["t"];
export const SEG_LABEL: Record<SegType, string> = {
  Todos: "Todos los pacientes", Inactivos: "Inactivos (sin visita)", Edad: "Rango de edad", Inconclusos: "Tratamiento inconcluso", Citas: "Citas próximas",
};
export const SEG_DEFAULT: Record<Exclude<SegType, "Todos">, [number, number]> = { Inactivos: [6, 0], Edad: [18, 35], Inconclusos: [1, 6], Citas: [1, 7] };
export const LINKS = ["Sin enlace", "Confirmar cita", "Gestionar cita", "Reservar cita", "Promoción"] as const;

export function segLabel(s: MsgSeg): string {
  return s.t === "Todos" ? "Todos los pacientes"
    : s.t === "Inactivos" ? `Sin visita hace ${s.a}+ meses`
    : s.t === "Edad" ? `Edad ${s.a}–${s.b} años`
    : s.t === "Inconclusos" ? `Tratamiento inconcluso hace ${s.a}–${s.b} meses`
    : `Cita en ${s.a}–${s.b} días`;
}

export interface PoolPatient { age: number; last: number; inc: number | null; next: number | null }

/**
 * Población de ejemplo (120 pacientes, generador determinista) para estimar el alcance de una campaña.
 * Se reemplaza por consultas reales a pacientes/citas al conectar la base de datos.
 */
export function demoPool(): PoolPatient[] {
  let seed = 7;
  const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 120 }, () => ({
    age: 6 + Math.floor(r() * 70),
    last: Math.floor(r() * r() * 600),
    inc: r() < 0.22 ? 20 + Math.floor(r() * 300) : null,
    next: r() < 0.18 ? 1 + Math.floor(r() * 30) : null,
  }));
}

export function segCount(pool: PoolPatient[], s: MsgSeg): number {
  return pool.filter((p) =>
    s.t === "Todos" ||
    (s.t === "Inactivos" && p.last >= s.a * 30) ||
    (s.t === "Edad" && p.age >= s.a && p.age <= s.b) ||
    (s.t === "Inconclusos" && p.inc !== null && p.inc >= s.a * 30 && p.inc <= s.b * 30) ||
    (s.t === "Citas" && p.next !== null && p.next >= s.a && p.next <= s.b),
  ).length;
}

/** Enlace que se agrega al mensaje. `base` es el dominio público de la empresa. */
export function linkUrl(link: string, promo: string, base: string): string {
  switch (link) {
    case "Confirmar cita": return `${base}/mi-cita/{cita}?accion=confirmar`;
    case "Gestionar cita": return `${base}/mi-cita/{cita}`;
    case "Reservar cita": return `${base}/reserva`;
    case "Promoción": return `${base}/reserva${promo ? "?promo=" + promo : ""}`;
    default: return "";
  }
}

/** Mensaje de error de configuración de la campaña (vacío si es válida). */
export function segWarning(link: string, s: MsgSeg): string {
  if ((link === "Confirmar cita" || link === "Gestionar cita") && s.t !== "Citas") return 'Este enlace requiere la audiencia "Citas próximas"';
  if ((s.t === "Edad" || s.t === "Inconclusos" || s.t === "Citas") && s.a > s.b) return 'El rango "desde" no puede ser mayor que "hasta"';
  return "";
}
