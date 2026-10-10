"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Appt } from "../agenda";
import { addAppts, agendaStore } from "../agenda-store";
import { addDays, todayISO } from "../dates";
import { anamnesisStore, notesStore, plansStore, planItems } from "../clinical";
import { ensurePatient, patchPatient, patientsStore } from "../patients";
import { paymentsStore } from "../payments";
import type { PortalData } from "../portal";
import { getClient, errText } from "./client";
import { CLINIC_SLUG, isRemote } from "./config";

/** Reserva y "Mi cita": en modo demo trabajan sobre el almacén local; en modo remoto, sobre las funciones públicas de Supabase. */

interface Busy { date: string; doctor_id: number; slot: number; dur: number }
const asAppt = (b: Busy, i: number): Appt => ({ id: -(i + 1), date: b.date, doc: b.doctor_id, slot: b.slot, dur: b.dur, p: "", s: "", st: "confirmada" });

export async function fetchBusy(): Promise<Appt[]> {
  const from = todayISO();
  const { data, error } = await getClient().rpc("public_busy", { p_slug: CLINIC_SLUG, p_from: from, p_to: addDays(from, 62) });
  if (error) throw error;
  return (data as Busy[]).map(asAppt);
}

/** Horarios ocupados (sin datos de pacientes) para calcular disponibilidad. */
export function useBusy(): Appt[] {
  const [local] = agendaStore.useStore();
  const [remote, setRemote] = useState<Appt[]>([]);
  useEffect(() => {
    if (!isRemote) return;
    let alive = true;
    const load = () => fetchBusy().then((l) => alive && setRemote(l)).catch(() => {});
    void load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return isRemote ? remote : local.appts;
}

export interface BookInput { doc: number | null; date: string; slot: number; dur: number; service: string; name: string; dni: string; phone: string; email?: string }
/** `existing`: el DNI ya era paciente de la clínica; `name` es el nombre con el que quedó registrado. */
export type BookResult = { ok: true; ref: string; doc: number; existing: boolean; name: string } | { ok: false; taken: boolean; error: string };

export async function bookPublic(b: BookInput, doctorIds: number[]): Promise<BookResult> {
  if (!isRemote) {
    const fresh = agendaStore.get().appts;
    const free = (d: number) => !fresh.some((x) => x.doc === d && x.date === b.date && x.st !== "cancelada" && b.slot < x.slot + x.dur && x.slot < b.slot + b.dur);
    const doc = b.doc ?? doctorIds.find(free) ?? null;
    if (doc === null || !free(doc)) return { ok: false, taken: true, error: "Ese horario ya fue ocupado" };
    const known = patientsStore.get().find((p) => p.dni === b.dni);
    const name = known?.name ?? b.name;
    const [a] = addAppts([{ date: b.date, doc, slot: b.slot, dur: b.dur, p: name, s: b.service, st: "pendiente", web: true, dni: b.dni, phone: b.phone }]);
    if (known) {
      if (b.email && !known.email) patchPatient(known.id, { email: b.email });
    } else ensurePatient({ name: b.name, dni: b.dni, phone: b.phone, email: b.email, web: true });
    return { ok: true, ref: String(a.id), doc, existing: !!known, name };
  }
  const { data, error } = await getClient().rpc("public_book", {
    p_slug: CLINIC_SLUG, p_doctor: b.doc, p_date: b.date, p_slot: b.slot, p_dur: b.dur, p_service: b.service, p_name: b.name, p_dni: b.dni, p_phone: b.phone, p_email: b.email?.trim() || null,
  });
  if (error) {
    const taken = error.message.includes("slot_taken");
    return { ok: false, taken, error: taken ? "Ese horario ya fue ocupado" : BOOK_ERRORS[error.message] ?? errText(error) };
  }
  const r = data as { token: string; doctor_id: number; existing: boolean; patient: string };
  return { ok: true, ref: r.token, doc: r.doctor_id, existing: r.existing, name: r.patient };
}

const BOOK_ERRORS: Record<string, string> = {
  too_many_pending: "Ya tienes 3 citas pendientes con este DNI. Confirma o cancela alguna para reservar otra.",
  invalid_dni: "El DNI debe tener 8 dígitos",
  invalid_hours: "Ese horario está fuera del horario de atención",
  invalid_email: "Revisa el correo electrónico",
  invalid_phone: "Revisa el número de teléfono",
  invalid_name: "Revisa el nombre",
  invalid_date: "Elige otra fecha",
  invalid_service: "Ese servicio ya no está disponible",
};

// ───────── Mi cita ─────────
export interface MyAppt { appt: Appt | null; busy: Appt[]; loading: boolean }

interface PublicAppt { id: number; patient: string; service: string; date: string; slot: number; dur: number; status: Appt["st"]; doctor_id: number }
const fromPublic = (r: PublicAppt, token: string): Appt => ({ id: r.id, date: r.date, doc: r.doctor_id, slot: r.slot, dur: r.dur, p: r.patient, s: r.service, st: r.status, token });

let mine: { token: string; appt: Appt | null; busy: Appt[]; loading: boolean } = { token: "", appt: null, busy: [], loading: true };
const subs = new Set<() => void>();
const emit = (next: typeof mine) => {
  mine = next;
  subs.forEach((l) => l());
};

export async function loadMine(token: string) {
  emit({ token, appt: null, busy: [], loading: true });
  const ok = /^[0-9a-f-]{36}$/i.test(token);
  if (!ok) return emit({ token, appt: null, busy: [], loading: false });
  const db = getClient();
  const [a, busy] = await Promise.all([db.rpc("public_appointment", { p_token: token }), fetchBusy().catch(() => [])]);
  const row = a.data as PublicAppt | null;
  emit({ token, appt: row ? fromPublic(row, token) : null, busy, loading: false });
}

/** Cita del enlace único (modo remoto): la cita + horarios ocupados para reprogramar. */
export function useMine(token: string): MyAppt {
  useEffect(() => {
    if (isRemote) void loadMine(token);
  }, [token]);
  const s = useSyncExternalStore((cb) => { subs.add(cb); return () => void subs.delete(cb); }, () => mine, () => mine);
  return { appt: s.token === token ? s.appt : null, busy: s.busy, loading: s.token !== token || s.loading };
}

export type MineAction = { kind: "confirm" } | { kind: "cancel" } | { kind: "reschedule"; date: string; slot: number; doc: number };

export async function actMine(token: string, a: MineAction): Promise<string | null> {
  const { data, error } = await getClient().rpc("public_appointment_action", {
    p_token: token, p_action: a.kind, p_date: a.kind === "reschedule" ? a.date : null, p_slot: a.kind === "reschedule" ? a.slot : null, p_doctor: a.kind === "reschedule" ? a.doc : null,
  });
  if (error) return error.message.includes("slot_taken") ? "Ese horario ya fue ocupado, elige otro" : errText(error);
  const row = data as PublicAppt | null;
  emit({ ...mine, appt: row ? fromPublic(row, token) : mine.appt });
  void fetchBusy().then((busy) => emit({ ...mine, busy })).catch(() => {});
  return null;
}

/** Demasiados intentos fallidos: el servidor bloquea la consulta 15 minutos. */
export const RATE_LIMITED = "rate_limited";
const tooMany = (e: { message?: string }) => (e.message?.includes(RATE_LIMITED) ? new Error(RATE_LIMITED) : e);

// ───────── Consultar mis citas ─────────
export interface FoundAppt { ref: string; date: string; slot: number; dur: number; service: string; status: Appt["st"]; doc: number }

/** Citas vigentes de un paciente: exige DNI y teléfono que coincidan con los de la cita. */
export async function lookupAppts(dni: string, phone: string): Promise<FoundAppt[]> {
  if (!isRemote) {
    const digits = (v: string) => v.replace(/\D/g, "").slice(-9);
    const min = addDays(todayISO(), -30);
    return agendaStore.get().appts
      .filter((a) => a.dni === dni && digits(a.phone ?? "") === digits(phone) && a.st !== "cancelada" && a.date >= min)
      .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
      .map((a) => ({ ref: String(a.id), date: a.date, slot: a.slot, dur: a.dur, service: a.s, status: a.st, doc: a.doc }));
  }
  const { data, error } = await getClient().rpc("public_lookup", { p_slug: CLINIC_SLUG, p_dni: dni, p_phone: phone });
  if (error) throw tooMany(error);
  return (data as { token: string; date: string; slot: number; dur: number; service: string; status: Appt["st"]; doctor_id: number }[]).map((r) => ({ ref: r.token, date: r.date, slot: r.slot, dur: r.dur, service: r.service, status: r.status, doc: r.doctor_id }));
}

// ───────── Portal de clientes ─────────
/**
 * Historial del paciente (citas, comprobantes y, si coincide la fecha de nacimiento, diagnósticos y tratamientos).
 * Devuelve null si no hay coincidencia de DNI + teléfono.
 */
export async function lookupPortal(dni: string, phone: string, birth?: string): Promise<PortalData | null> {
  if (!isRemote) {
    const digits = (v: string) => v.replace(/\D/g, "").slice(-9);
    const patient = patientsStore.get().find((p) => p.dni === dni && digits(p.phone ?? "") === digits(phone));
    const appts = agendaStore.get().appts.filter((a) => a.st !== "bloqueo" && ((a.dni === dni && digits(a.phone ?? "") === digits(phone)) || (patient && !a.dni && a.p.toLowerCase() === patient.name.toLowerCase())));
    if (!patient && !appts.length) return null;
    const ids = new Set(appts.map((a) => a.id));
    const fnac = patient ? anamnesisStore.get()[patient.id]?.v.fnac ?? "" : "";
    const verified = !!patient && !!fnac && birth === fnac;
    return {
      name: patient?.name ?? appts[0].p,
      verified,
      hasBirth: !!fnac,
      appts: appts.map((a) => ({ id: a.id, ref: String(a.id), date: a.date, slot: a.slot, dur: a.dur, service: a.s, status: a.st, doc: a.doc })),
      payments: paymentsStore.get().filter((p) => !p.voided && ((patient && p.patientId === patient.id) || (p.apptId !== undefined && ids.has(p.apptId)))).map((p) => ({ id: p.id, no: p.no, ...(p.apptId !== undefined ? { apptId: p.apptId } : {}), concept: p.concept, amount: p.amount, method: p.method, at: p.at })),
      notes: verified && patient ? (notesStore.get()[patient.id] ?? []).map((n) => ({ id: n.id, date: n.date, text: n.t })) : [],
      plan: verified && patient ? planItems(plansStore.get()[patient.id]).map((i) => ({ name: i.name, total: i.total, done: i.done, price: i.price, paid: i.paid, initial: i.initial })) : [],
    };
  }
  const { data, error } = await getClient().rpc("public_portal", { p_slug: CLINIC_SLUG, p_dni: dni, p_phone: phone, p_birth: birth || null });
  if (error) throw tooMany(error);
  if (!data) return null;
  const d = data as { name: string; verified: boolean; hasBirth: boolean; appts: { id: number; ref: string; date: string; slot: number; dur: number; service: string; status: Appt["st"]; doctor_id: number }[]; payments: { id: number; no: string; appt_id: number | null; concept: string; amount: number; method: string; at: string }[]; notes: { id: number; date: string; text: string; created_at?: string }[]; plan: PortalData["plan"] };
  return {
    name: d.name, verified: d.verified, hasBirth: d.hasBirth,
    appts: d.appts.map((a) => ({ id: Number(a.id), ref: a.ref, date: a.date, slot: a.slot, dur: a.dur, service: a.service, status: a.status, doc: a.doctor_id })),
    payments: d.payments.map((p) => ({ id: Number(p.id), no: p.no, ...(p.appt_id != null ? { apptId: Number(p.appt_id) } : {}), concept: p.concept, amount: Number(p.amount), method: p.method, at: p.at })),
    notes: d.notes.map((n) => ({ id: Number(n.id), date: n.date, text: n.text, ...(n.created_at ? { at: n.created_at } : {}) })),
    plan: d.plan,
  };
}
