import { WEEKDAYS_LONG, labelLong, weekday } from "./dates";

/**
 * Horario de atención de la clínica: horas por día de la semana y cierres especiales (feriados, vacaciones).
 * Las horas son tramos de la grilla de 24 h (0 = 00:00, tramos de 15 min; `to` es exclusivo: 68 = 17:00, 96 = 24:00).
 */
export const GRID_SLOTS = 96;
export interface DayHours { open: boolean; from: number; to: number }
export interface Closure { id: string; date: string; label: string }
export interface Schedule {
  /** versión del formato (2 = grilla de 24 h); un horario guardado en el formato anterior se descarta */
  v?: number;
  /** 0 = domingo … 6 = sábado */
  days: DayHours[];
  closures: Closure[];
}

export const DEFAULT_SCHEDULE: Schedule = {
  days: [0, 1, 2, 3, 4, 5, 6].map((d) => ({ open: d !== 0, from: 36, to: 68 })),
  closures: [],
};

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => (Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Math.round(Number(n)))) : fallback);

/** Completa y sanea el horario guardado (por si falta o viene incompleto). */
export function scheduleOf(raw?: Partial<Schedule> | null): Schedule {
  const current = raw?.v === 2;
  const days = DEFAULT_SCHEDULE.days.map((d, i) => {
    const r = current ? raw?.days?.[i] : undefined;
    if (!r) return d;
    const from = clamp(r.from, 0, GRID_SLOTS - 1, d.from);
    const to = clamp(r.to, from + 1, GRID_SLOTS, d.to);
    return { open: !!r.open, from, to };
  });
  return { v: 2, days, closures: (raw?.closures ?? []).filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) };
}

export type Window = { from: number; to: number };

/** Horas de atención de un día, o null si la clínica no atiende (día de descanso o cierre especial). */
export function dayWindow(date: string, s: Schedule): Window | null {
  if (s.closures.some((c) => c.date === date)) return null;
  const d = s.days[weekday(date)];
  return d?.open ? { from: d.from, to: d.to } : null;
}

/** Por qué no se atiende ese día ("" si se atiende). */
export function closedReason(date: string, s: Schedule): string {
  const c = s.closures.find((x) => x.date === date);
  if (c) return `Cierre especial${c.label ? `: ${c.label}` : ""}`;
  const name = WEEKDAYS_LONG[weekday(date)];
  return s.days[weekday(date)]?.open ? "" : `Los ${name.endsWith("s") ? name : name + "s"} no hay atención`;
}

/** Primer día de atención desde `iso` (inclusive). Si nunca se atiende, devuelve `iso`. */
export function nextOpen(iso: string, s: Schedule): string {
  for (let i = 0; i < 400; i++) {
    const d = addDaysIso(iso, i);
    if (dayWindow(d, s)) return d;
  }
  return iso;
}
const addDaysIso = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

const hhmm = (slot: number) => {
  const m = slot * 15;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
};
const DAY_ABBR = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Resumen para el sitio público: "Lun–Vie 9:00–17:00 · Sáb 9:00–13:00". Los días contiguos con el mismo horario se agrupan. */
export function scheduleSummary(s: Schedule): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const groups: { days: number[]; text: string }[] = [];
  for (const d of order) {
    const h = s.days[d];
    if (!h.open) continue;
    const text = `${hhmm(h.from)}–${hhmm(h.to)}`;
    const last = groups[groups.length - 1];
    if (last && last.text === text && order.indexOf(last.days[last.days.length - 1]) === order.indexOf(d) - 1) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  if (!groups.length) return "Cerrado";
  return groups.map((g) => `${g.days.length > 1 ? `${DAY_ABBR[g.days[0]]}–${DAY_ABBR[g.days[g.days.length - 1]]}` : DAY_ABBR[g.days[0]]} ${g.text}`).join(" · ");
}

export { labelLong };
