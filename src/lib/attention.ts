import { type Appt, DAY_START_MIN, SLOTS, clash, hm } from "./agenda";
import { limaMinutesNow } from "./dates";

/** Atención en consulta: inicio/fin reales, extensión manual y avisos de demora al siguiente paciente. */

export const startMin = (a: Pick<Appt, "slot">) => DAY_START_MIN + a.slot * 15;
export const endMin = (a: Pick<Appt, "slot" | "dur">) => DAY_START_MIN + (a.slot + a.dur) * 15;
const CLOSED = new Set(["cancelada", "atendida", "no-show", "bloqueo"]);
export const isClosed = (a: Pick<Appt, "st">) => CLOSED.has(a.st);

/** En curso: el doctor marcó el inicio (o el paciente está en sala) y aún no marcó el fin. */
export const inProgress = (a: Appt) => !a.t1 && !isClosed(a) && (!!a.t0 || a.st === "en-sala");

/** Hora de Lima "HH:MM" de un instante ISO. */
export function limaHM(iso: string): string {
  const m = limaMinutesNow(new Date(iso));
  return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
}
export const minutesBetween = (a: string, b: string) => Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));

export type ResizeCheck = { ok: true } | { ok: false; error: string };

/** Cambiar la duración (en tramos de 15 min) de forma manual: no puede pisar la cita siguiente ni pasar de las 17:00. */
export function checkResize(list: Appt[], a: Appt, dur: number): ResizeCheck {
  if (!Number.isInteger(dur) || dur < 1) return { ok: false, error: "La cita debe durar al menos 15 min" };
  if (a.slot + dur > SLOTS) return { ok: false, error: "No se puede pasar de las 24:00" };
  const hit = clash(list, { date: a.date, doc: a.doc, slot: a.slot, dur }, a.id);
  if (hit) return { ok: false, error: `Choca con ${hit.p} (${hm(hit.slot)}). Avísale o reprográmalo primero.` };
  return { ok: true };
}

export interface DelayAlert {
  current: Appt;
  next: Appt;
  /** minutos pasados del fin programado de la cita en curso */
  overrun: number;
  /** minutos que el siguiente paciente ya lleva esperando (0 si aún no llega su hora) */
  wait: number;
}

/** Citas en curso que ya pasaron su hora de fin sin marcarlo, con un paciente cercano esperando (hoy, en horario de atención). */
export function delayAlerts(appts: Appt[], today: string, nowMin: number, horizon = 30): DelayAlert[] {
  if (nowMin < 0) return [];
  const day = appts.filter((a) => a.date === today);
  const out: DelayAlert[] = [];
  for (const current of day) {
    if (!inProgress(current) || nowMin < endMin(current)) continue;
    const next = day
      .filter((b) => b.doc === current.doc && b.id !== current.id && !isClosed(b) && !b.t0 && b.slot > current.slot)
      .sort((x, y) => x.slot - y.slot)[0];
    if (!next || startMin(next) - nowMin > horizon) continue;
    out.push({ current, next, overrun: nowMin - endMin(current), wait: Math.max(0, nowMin - startMin(next)) });
  }
  return out;
}

const ceil5 = (n: number) => Math.ceil(n / 5) * 5;
/** Demora estimada para el siguiente: lo que ya espera más un margen para cerrar la atención en curso. */
export const suggestedDelay = (al: DelayAlert) => Math.max(10, ceil5(al.wait + 10));

export function delayMessage(o: { name: string; clinic: string; minutes: number; when: string; link?: string }): string {
  const first = o.name.split(" ")[0];
  return `Hola ${first}, te escribimos de ${o.clinic}. Tu cita de las ${o.when} se retrasará unos ${o.minutes} minutos porque la atención anterior se extendió. Disculpa la molestia; te avisamos apenas podamos recibirte.${o.link ? ` Si prefieres cambiar el horario, reprograma aquí: ${o.link}` : ""}`;
}
export function rescheduleMessage(o: { name: string; clinic: string; when: string; link?: string }): string {
  const first = o.name.split(" ")[0];
  return `Hola ${first}, te escribimos de ${o.clinic}. Por una demora en la atención anterior no podremos recibirte a las ${o.when}. ¿Te parece reprogramar tu cita?${o.link ? ` Elige un nuevo horario aquí: ${o.link}` : " Respóndenos y te ofrecemos el primer horario disponible."} Disculpa la molestia.`;
}
