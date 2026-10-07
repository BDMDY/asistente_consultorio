import { addDays, dayNumber, dayOfMonth, fromDayNumber, isISODate, labelLong, labelShort, nextOpenDay, todayISO, weekday } from "./dates";

/** La agenda trabaja en tramos de 15 min entre 09:00 y 17:00 (32 tramos). Domingos cerrado. */
export const SLOTS = 32;
export const SLOT_MIN = 15;
export const DAY_START_MIN = 9 * 60;

export type ApptStatus = "pendiente" | "confirmada" | "en-sala" | "atendida" | "cancelada" | "no-show" | "reprogramada";

export const STATUS_LABEL: Record<ApptStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  "en-sala": "En sala",
  atendida: "Atendida",
  cancelada: "Cancelada",
  "no-show": "No-show",
  reprogramada: "Reprogramada",
};

export interface Appt {
  id: number;
  /** YYYY-MM-DD, hora de Lima */
  date: string;
  /** id del doctor (lista de Medios de marca) */
  doc: number;
  /** tramo de inicio, 0 = 09:00 */
  slot: number;
  /** duración en tramos */
  dur: number;
  /** nombre del paciente */
  p: string;
  /** servicio */
  s: string;
  st: ApptStatus;
  /** reservada desde la web */
  web?: boolean;
  notes?: string;
  dni?: string;
  phone?: string;
  /** enlace único de "Mi cita" (solo modo remoto) */
  token?: string;
}

export interface AgendaState {
  appts: Appt[];
  nid: number;
}

export const hm = (slot: number) => {
  const m = DAY_START_MIN + slot * SLOT_MIN;
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
};

/** "HH:MM" → tramo, o null si no cae en la grilla de 15 min dentro del horario. */
export function slotOf(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time || "");
  if (!m) return null;
  const v = (+m[1] * 60 + +m[2] - DAY_START_MIN) / SLOT_MIN;
  return Number.isInteger(v) && v >= 0 && v < SLOTS ? v : null;
}

export const isClosedDay = (iso: string) => weekday(iso) === 0;

type Slotted = Pick<Appt, "date" | "doc" | "slot" | "dur">;

/** Cita activa que se solapa con `a` (mismo día y doctor), ignorando `ignoreId`. */
export function clash(list: Appt[], a: Slotted, ignoreId?: number): Appt | null {
  return (
    list.find(
      (b) =>
        b.id !== ignoreId &&
        b.date === a.date &&
        b.doc === a.doc &&
        b.st !== "cancelada" &&
        a.slot < b.slot + b.dur &&
        b.slot < a.slot + a.dur,
    ) ?? null
  );
}

/** Tramos de inicio libres para una cita de `dur` tramos. `step` 2 = cada 30 min (reserva web). */
export function freeStarts(list: Appt[], date: string, doc: number, dur: number, opts: { step?: number; ignoreId?: number } = {}) {
  const out: number[] = [];
  if (!isISODate(date) || isClosedDay(date)) return out;
  for (let s = 0; s + dur <= SLOTS; s += opts.step ?? 1) {
    if (!clash(list, { date, doc, slot: s, dur }, opts.ignoreId)) out.push(s);
  }
  return out;
}

/** Disponibilidad pública: con `doc = null` ("sin preferencia") basta con que algún doctor esté libre. */
export function isSlotTaken(list: Appt[], doctorIds: number[], date: string, doc: number | null, slot: number, dur: number) {
  if (slot + dur > SLOTS) return true;
  const free = (d: number) => !clash(list, { date, doc: d, slot, dur });
  return doc === null ? !doctorIds.some(free) : !free(doc);
}

export function firstFreeDoctor(list: Appt[], doctorIds: number[], date: string, slot: number, dur: number): number | null {
  return doctorIds.find((d) => !clash(list, { date, doc: d, slot, dur })) ?? null;
}

// ---------- citas en serie ----------

export type SeriesFreq = "weekly" | "biweekly" | "monthly";
export interface SeriesRule {
  freq: SeriesFreq;
  /** índice 0 = domingo … 6 = sábado */
  days: boolean[];
  endMode: "count" | "date";
  count: number;
  until: string;
  onClash: "skip" | "move";
}
export interface SeriesEntry {
  date: string;
  slot: number;
  status: "ok" | "moved" | "skip";
  note?: string;
}

/** Calcula la vista previa de la serie sin crear nada. Los choques se omiten o se mueven al siguiente hueco. */
export function generateSeries(
  list: Appt[],
  base: { date: string; slot: number; doc: number; dur: number },
  rule: SeriesRule,
): SeriesEntry[] {
  if (!isISODate(base.date)) return [];
  const startN = dayNumber(base.date);
  const limit = rule.endMode === "count" ? Math.max(2, Math.min(30, Math.trunc(+rule.count) || 2)) : 999;
  const untilN = rule.endMode === "date" && isISODate(rule.until) ? dayNumber(rule.until) : null;
  const work = list.slice();
  const out: SeriesEntry[] = [];
  let found = 0;
  for (let n = startN; n < startN + 400 && found < limit && out.length < 60; n++) {
    if (untilN !== null && n > untilN) break;
    const date = fromDayNumber(n);
    let hit: boolean;
    if (rule.freq === "monthly") hit = dayOfMonth(date) === dayOfMonth(base.date);
    else {
      const week = Math.floor((n - startN) / 7);
      hit = rule.days[weekday(date)] && (rule.freq === "weekly" || week % 2 === 0);
    }
    if (!hit) continue;
    found++;
    const cand = { id: 0, date, doc: base.doc, slot: base.slot, dur: base.dur } as Appt;
    const conflict = clash(work, cand);
    if (!conflict) {
      out.push({ date, slot: base.slot, status: "ok" });
      work.push(cand);
      continue;
    }
    if (rule.onClash === "move") {
      let s2: number | null = null;
      for (let s = base.slot + 1; s + base.dur <= SLOTS; s++) {
        if (!clash(work, { date, doc: base.doc, slot: s, dur: base.dur })) {
          s2 = s;
          break;
        }
      }
      if (s2 !== null) {
        out.push({ date, slot: s2, status: "moved", note: "Movida desde " + hm(base.slot) });
        work.push({ ...cand, slot: s2 });
        continue;
      }
    }
    out.push({ date, slot: base.slot, status: "skip", note: "Choca con " + conflict.p });
  }
  return out;
}

// ---------- reprogramar ----------

export type RescheduleCheck = { ok: true } | { ok: false; error: string; conflict?: Appt };

export function checkReschedule(list: Appt[], a: Appt, target: { date: string; slot: number | null; doc: number }, today = todayISO()): RescheduleCheck {
  if (!isISODate(target.date) || target.date < today) return { ok: false, error: "Elige una fecha válida (desde hoy)" };
  if (isClosedDay(target.date)) return { ok: false, error: "Los domingos no hay atención" };
  if (target.slot === null) return { ok: false, error: "Hora entre 09:00 y 16:45, en tramos de 15 min" };
  if (target.slot + a.dur > SLOTS) return { ok: false, error: "La cita terminaría después de las 17:00" };
  const hit = clash(list, { date: target.date, doc: target.doc, slot: target.slot, dur: a.dur }, a.id);
  if (hit) return { ok: false, error: `Choca con ${hit.p} (${hm(hit.slot)}–${hm(hit.slot + hit.dur)})`, conflict: hit };
  if (target.date === a.date && target.slot === a.slot && target.doc === a.doc) return { ok: false, error: "Es el mismo horario de la cita actual" };
  return { ok: true };
}

// ---------- semilla de demostración (relativa a hoy) ----------

export function seedAgenda(today = todayISO()): AgendaState {
  const d0 = nextOpenDay(today);
  const d19 = nextOpenDay(addDays(d0, 19));
  const A = (id: number, date: string, doc: number, slot: number, dur: number, p: string, s: string, st: ApptStatus): Appt => ({ id, date, doc, slot, dur, p, s, st });
  return {
    nid: 100,
    appts: [
      A(1, d0, 1, 0, 3, "M. Soto", "Limpieza", "atendida"),
      A(2, d0, 1, 6, 3, "Lucía Rojas", "Ortodoncia", "pendiente"),
      A(3, d0, 1, 12, 4, "J. Ramos", "Endodoncia", "confirmada"),
      A(4, d0, 2, 2, 3, "C. Díaz", "Control", "en-sala"),
      A(5, d0, 2, 8, 4, "P. Vera", "Endodoncia", "confirmada"),
      A(6, d0, 3, 0, 4, "A. Cruz", "Blanqueamiento", "reprogramada"),
      A(7, d0, 3, 10, 3, "T. Luna", "Limpieza", "confirmada"),
      A(8, d19, 1, 4, 3, "J. Ramos", "Control", "confirmada"),
    ],
  };
}

export const apptWhenLong = (a: Pick<Appt, "date" | "slot">) => `${labelLong(a.date)} · ${hm(a.slot)}`;
export const apptWhenShort = (a: Pick<Appt, "date" | "slot">) => `${labelShort(a.date)} ${hm(a.slot)}`;
