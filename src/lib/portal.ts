import { type Appt, hm } from "./agenda";
import { limaHM } from "./attention";
import { todayISO } from "./dates";
import type { Payment } from "./payments";

/** Datos del portal de clientes: lo que el paciente puede ver de sí mismo. */
export interface PortalAppt { id: number; ref: string; date: string; slot: number; dur: number; service: string; status: Appt["st"]; doc: number }
export interface PortalPay { id: number; no: string; apptId?: number; concept: string; amount: number; method: string; at: string }
export interface PortalNote { id: number; date: string; text: string; /** ISO de creación, si se conoce */ at?: string }
export interface PortalPlanItem { name: string; total: number; done: number; price: number; paid?: number; initial?: number }
export interface PortalData {
  name: string;
  /** coincidió la fecha de nacimiento: se muestran diagnósticos y tratamientos */
  verified: boolean;
  /** la ficha tiene fecha de nacimiento registrada (si no, no se puede verificar en línea) */
  hasBirth: boolean;
  appts: PortalAppt[];
  payments: PortalPay[];
  notes: PortalNote[];
  plan: PortalPlanItem[];
}

export interface TimelineGroup {
  key: string;
  date: string;
  /** HH:MM de Lima, si se conoce */
  time: string;
  /** cita (con sus comprobantes y notas del día), comprobante suelto o nota suelta */
  kind: "cita" | "comprobante" | "nota";
  appt?: PortalAppt;
  pays: PortalPay[];
  notes: PortalNote[];
}

const payDate = (p: PortalPay) => todayISO(new Date(p.at));
const noteTime = (n: PortalNote) => (n.at ? limaHM(n.at) : "");

/** Agrupa los comprobantes por número (un comprobante por cita). */
export function receiptsOf(pays: PortalPay[]): PortalPay[][] {
  const by = new Map<string, PortalPay[]>();
  for (const p of pays.slice().sort((a, b) => a.at.localeCompare(b.at))) by.set(p.no, [...(by.get(p.no) ?? []), p]);
  return [...by.values()];
}

/**
 * Historial cronológico: cada cita lleva sus comprobantes y los diagnósticos del mismo día; lo que no pertenece a ninguna
 * cita (un pago suelto, una nota de otro día) va como registro propio. `desc` = más reciente primero.
 */
export function buildTimeline(d: PortalData, desc = true): TimelineGroup[] {
  const out: TimelineGroup[] = [];
  const usedPay = new Set<string>();
  const usedNote = new Set<number>();
  const apptIds = new Set(d.appts.map((a) => a.id));
  for (const a of d.appts) {
    const pays = d.payments.filter((p) => p.apptId === a.id);
    pays.forEach((p) => usedPay.add(p.no));
    const notes = d.notes.filter((n) => n.date === a.date && !usedNote.has(n.id));
    notes.forEach((n) => usedNote.add(n.id));
    out.push({ key: "a" + a.id, date: a.date, time: hm(a.slot), kind: "cita", appt: a, pays, notes });
  }
  for (const r of receiptsOf(d.payments.filter((p) => !(p.apptId !== undefined && apptIds.has(p.apptId))))) {
    if (usedPay.has(r[0].no)) continue;
    out.push({ key: "p" + r[0].no, date: payDate(r[0]), time: limaHM(r[0].at), kind: "comprobante", pays: r, notes: [] });
  }
  for (const n of d.notes) if (!usedNote.has(n.id)) out.push({ key: "n" + n.id, date: n.date, time: noteTime(n), kind: "nota", pays: [], notes: [n] });
  out.sort((x, y) => (`${x.date} ${x.time || "00:00"}`).localeCompare(`${y.date} ${y.time || "00:00"}`) * (desc ? -1 : 1));
  return out;
}

/** Cobros como Payment (para reutilizar el comprobante imprimible). */
export const asPayment = (p: PortalPay, patient: string): Payment => ({ id: p.id, no: p.no, ...(p.apptId !== undefined ? { apptId: p.apptId } : {}), patient, concept: p.concept, amount: p.amount, method: p.method as Payment["method"], date: "", at: p.at });
