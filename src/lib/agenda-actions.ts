"use client";
import { type Appt, type ApptStatus, STATUS_LABEL, apptWhenShort, clash, generateSeries, hm, isClosedDay, slotOf, SLOTS, type SeriesRule } from "./agenda";
import { addAppts, agendaStore, patchAppt, removeAppts } from "./agenda-store";
import { checkResize, minutesBetween } from "./attention";
import { isISODate } from "./dates";
import { newId } from "./ids";
import { mediaStore, parsePrice, resolveMedia } from "./media";
import { enqueue } from "./outbox";
import { type PayMethod, addPayment, paymentsStore } from "./payments";
import { patientsStore } from "./patients";

export const DEFAULT_PRICE = 150;

/** Precio de una cita: el del servicio con ese nombre, o 150 por defecto (igual que el prototipo). */
export function priceFor(a: Pick<Appt, "s">): number {
  const sv = resolveMedia(mediaStore.get()).services.find((s) => s.name === a.s);
  const n = sv ? parsePrice(sv.price) : NaN;
  return n > 0 ? n : DEFAULT_PRICE;
}

/** Saldo pendiente de la cita: precio − cobros registrados (0 si ya fue atendida). */
export function balanceFor(a: Appt, paid: number): number {
  return a.st === "atendida" ? 0 : Math.max(0, priceFor(a) - paid);
}

export function confirmAppt(id: number) {
  patchAppt(id, { st: "confirmada" });
}

export const CANCEL_REASONS = ["Lo pidió el paciente", "No contestó", "Reprogramará", "Otro"] as const;

export function cancelAppt(a: Appt, o: { reason: number; notify: boolean }) {
  patchAppt(a.id, { st: "cancelada", notes: [a.notes, `Cancelada: ${CANCEL_REASONS[o.reason]}`].filter(Boolean).join(" · ") });
  if (o.notify) enqueue({ kind: "cancelacion", channel: "whatsapp", patient: a.p, apptId: a.id, text: `Tu cita del ${apptWhenShort(a)} fue cancelada. Puedes reservar otra cuando quieras.` });
  return () => patchAppt(a.id, { st: a.st, notes: a.notes });
}

/** Reactiva una cita cancelada (queda pendiente de confirmar). Devuelve el error si su horario fue ocupado, o un deshacer. */
export function reactivateAppt(a: Appt): { error: string } | { undo: () => void } {
  const hit = clash(agendaStore.get().appts, a, a.id);
  if (hit) return { error: `No se puede reactivar: ese horario lo ocupa ${hit.p} (${hm(hit.slot)}–${hm(hit.slot + hit.dur)})` };
  patchAppt(a.id, { st: "pendiente" });
  return { undo: () => patchAppt(a.id, { st: "cancelada" }) };
}

export function rescheduleAppt(a: Appt, to: { date: string; slot: number; doc: number }) {
  patchAppt(a.id, { ...to, st: "reprogramada" });
  enqueue({ kind: "reprogramacion", channel: "whatsapp", patient: a.p, apptId: a.id, text: `Tu cita se reprogramó para el ${apptWhenShort({ date: to.date, slot: to.slot })}.` });
}

export function chargeAppt(a: Appt, amount: number, method: PayMethod) {
  const p = addPayment({ apptId: a.id, patient: a.p, concept: a.s, amount, method, date: apptWhenShort(a) });
  patchAppt(a.id, { st: "atendida" });
  return p;
}

export const paidFor = (apptId: number) => paymentsStore.get().filter((p) => p.apptId === apptId).reduce((n, p) => n + p.amount, 0);

export type MoveCheck = { ok: true } | { ok: false; error: string };

/** Mover una cita a otro doctor/tramo (arrastrar o teclado). */
export function checkMove(list: Appt[], a: Appt, to: { doc: number; slot: number }, doctorIds: number[]): MoveCheck {
  if (to.slot < 0 || to.slot + a.dur > SLOTS || !doctorIds.includes(to.doc)) return { ok: false, error: "No se puede mover más allá" };
  if (clash(list, { date: a.date, doc: to.doc, slot: to.slot, dur: a.dur }, a.id)) return { ok: false, error: "Choque: ese horario ya está ocupado" };
  return { ok: true };
}

export function moveAppt(a: Appt, to: { doc: number; slot: number }) {
  patchAppt(a.id, to);
}

// ---------- crear citas ----------

export interface NewApptForm {
  patient: string;
  isNew: boolean;
  svc: string;
  doc: number;
  date: string;
  time: string;
  dur: number;
  notes: string;
}

export function validateNew(list: Appt[], f: NewApptForm, mode: "single" | "series", rule: SeriesRule, today: string): string {
  const slot = slotOf(f.time);
  if (f.patient.trim().length < 3) return "Indica el paciente";
  if (!isISODate(f.date) || f.date < today) return "Elige una fecha válida (desde hoy)";
  if (isClosedDay(f.date)) return "Los domingos no hay atención";
  if (slot === null) return "Hora entre 09:00 y 16:45, en tramos de 15 min";
  if (slot + f.dur > SLOTS) return "La cita termina después de las 17:00";
  if (mode === "single") {
    if (clash(list, { date: f.date, doc: f.doc, slot, dur: f.dur })) return "Ese horario ya está ocupado";
  } else {
    if (!rule.days.some(Boolean) && rule.freq !== "monthly") return "Elige al menos un día de la semana";
    if (!generateSeries(list, { date: f.date, slot, doc: f.doc, dur: f.dur }, rule).some((x) => x.status !== "skip")) return "Ninguna fecha disponible";
  }
  return "";
}

export function createAppts(f: NewApptForm, mode: "single" | "series", rule: SeriesRule) {
  const list = agendaStore.get().appts;
  const slot = slotOf(f.time)!;
  const base = { doc: f.doc, dur: f.dur, p: f.patient.trim(), s: f.svc, st: "pendiente" as ApptStatus, notes: f.notes || undefined };
  const plan = mode === "single" ? [{ date: f.date, slot, status: "ok" as const }] : generateSeries(list, { date: f.date, slot, doc: f.doc, dur: f.dur }, rule);
  const items = plan.filter((x) => x.status !== "skip").map((x) => ({ ...base, date: x.date, slot: x.slot }));
  const skipped = plan.length - items.length;
  if (f.isNew) {
    const name = base.p.toLowerCase();
    patientsStore.update((l) => (l.some((p) => p.name.toLowerCase() === name) ? l : [...l, { id: newId(), name: base.p, dni: "", phone: "", alerts: [] }]));
  }
  const created = addAppts(items);
  return { created, skipped, undo: () => removeAppts(created.map((c) => c.id)) };
}

export const statusLabel = (s: ApptStatus) => STATUS_LABEL[s];
export const slotLabel = hm;

// ---------- atención en consulta ----------

export function resizeAppt(a: Appt, dur: number): { error: string } | { undo: () => void } {
  const c = checkResize(agendaStore.get().appts, a, dur);
  if (!c.ok) return { error: c.error };
  const before = a.dur;
  patchAppt(a.id, { dur });
  return { undo: () => patchAppt(a.id, { dur: before }) };
}

/** Marca el inicio real de la atención (el paciente pasa a "En sala"). */
export function startAttention(a: Appt) {
  patchAppt(a.id, { t0: new Date().toISOString(), t1: undefined, st: "en-sala" });
}

/** Marca el fin real de la atención; no cambia el estado (queda por cobrar). */
export function finishAttention(a: Appt): number {
  const now = new Date().toISOString();
  patchAppt(a.id, { t1: now });
  return a.t0 ? minutesBetween(a.t0, now) : 0;
}
