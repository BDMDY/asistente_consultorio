import type { Appt, ApptStatus } from "../agenda";
import type { ClinicalNote, PatientFile } from "../clinical";
import type { OutboxItem } from "../outbox";
import type { Patient } from "../patients";
import type { PayMethod, Payment } from "../payments";

/** Conversores entre los modelos de la app y las filas de Supabase (todo bigint viaja como número: caben en 2^53). */
export interface Row { [k: string]: unknown }

export const patientToRow = (c: string, p: Patient): Row => ({ clinic_id: c, id: p.id, name: p.name, dni: p.dni, phone: p.phone, email: p.email ?? null, web: !!p.web, alerts: p.alerts });
export const rowToPatient = (r: Row): Patient => ({ id: Number(r.id), name: r.name as string, dni: (r.dni as string) ?? "", phone: (r.phone as string) ?? "", ...(r.email ? { email: r.email as string } : {}), ...(r.web ? { web: true } : {}), alerts: (r.alerts as string[]) ?? [] });

export const apptToRow = (c: string, a: Appt): Row => ({ clinic_id: c, id: a.id, date: a.date, doctor_id: a.doc, slot: a.slot, dur: a.dur, patient_name: a.p, service: a.s, status: a.st, web: !!a.web, notes: a.notes ?? null, dni: a.dni ?? null, phone: a.phone ?? null });
export const rowToAppt = (r: Row): Appt => ({
  id: Number(r.id), date: r.date as string, doc: Number(r.doctor_id), slot: Number(r.slot), dur: Number(r.dur), p: r.patient_name as string, s: r.service as string, st: r.status as ApptStatus,
  ...(r.web ? { web: true } : {}), ...(r.notes ? { notes: r.notes as string } : {}), ...(r.dni ? { dni: r.dni as string } : {}), ...(r.phone ? { phone: r.phone as string } : {}), ...(r.public_token ? { token: r.public_token as string } : {}),
});

export const paymentToRow = (c: string, p: Payment): Row => ({ clinic_id: c, id: p.id, no: p.no, appt_id: p.apptId ?? null, patient: p.patient, concept: p.concept, amount: p.amount, method: p.method, label: p.date, at: p.at });
export const rowToPayment = (r: Row): Payment => ({ id: Number(r.id), no: r.no as string, ...(r.appt_id != null ? { apptId: Number(r.appt_id) } : {}), patient: r.patient as string, concept: r.concept as string, amount: Number(r.amount), method: r.method as PayMethod, date: (r.label as string) ?? "", at: r.at as string });

export const outboxToRow = (c: string, o: OutboxItem): Row => ({ clinic_id: c, id: o.id, kind: o.kind, channel: o.channel, patient: o.patient, appt_id: o.apptId ?? null, text: o.text, at: o.at, status: o.status });
export const rowToOutbox = (r: Row): OutboxItem => ({ id: Number(r.id), kind: r.kind as OutboxItem["kind"], channel: r.channel as OutboxItem["channel"], patient: r.patient as string, ...(r.appt_id != null ? { apptId: Number(r.appt_id) } : {}), text: r.text as string, at: r.at as string, status: r.status as OutboxItem["status"] });

export const noteToRow = (c: string, patientId: number, n: ClinicalNote): Row => ({ clinic_id: c, id: n.id, patient_id: patientId, text: n.t, date: n.date });
export const fileToRow = (c: string, patientId: number, f: PatientFile): Row => ({ clinic_id: c, id: f.id, patient_id: patientId, name: f.n, size_label: f.s, date: f.date });

/** Agrupa filas por paciente conservando el orden de entrada. */
export function groupByPatient<T>(rows: Row[], conv: (r: Row) => T): Record<number, T[]> {
  const out: Record<number, T[]> = {};
  for (const r of rows) (out[Number(r.patient_id)] ??= []).push(conv(r));
  return out;
}
export const rowToNote = (r: Row): ClinicalNote => ({ id: Number(r.id), t: r.text as string, date: r.date as string });
export const rowToFile = (r: Row): PatientFile => ({ id: Number(r.id), n: r.name as string, s: (r.size_label as string) ?? "", date: r.date as string });

// ───────── Diferencias ─────────
export interface Diff<T> { upsert: T[]; remove: (string | number)[] }

/** Elementos nuevos o cambiados, e identificadores eliminados, entre dos listas. */
export function diffById<T>(prev: T[], next: T[], id: (t: T) => string | number): Diff<T> {
  const before = new Map(prev.map((x) => [id(x), JSON.stringify(x)]));
  const seen = new Set<string | number>();
  const upsert: T[] = [];
  for (const x of next) {
    seen.add(id(x));
    if (before.get(id(x)) !== JSON.stringify(x)) upsert.push(x);
  }
  return { upsert, remove: [...before.keys()].filter((k) => !seen.has(k)) };
}

/** Aplana un mapa por paciente a una lista de {patientId, item}. */
export const flatten = <T>(m: Record<number, T[]>) => Object.entries(m).flatMap(([pid, list]) => (list ?? []).map((item) => ({ pid: Number(pid), item })));
