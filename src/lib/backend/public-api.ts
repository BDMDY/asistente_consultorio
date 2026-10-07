"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Appt } from "../agenda";
import { addAppts, agendaStore } from "../agenda-store";
import { addDays, todayISO } from "../dates";
import { ensurePatient } from "../patients";
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

export interface BookInput { doc: number | null; date: string; slot: number; dur: number; service: string; name: string; dni: string; phone: string }
export type BookResult = { ok: true; ref: string; doc: number } | { ok: false; taken: boolean; error: string };

export async function bookPublic(b: BookInput, doctorIds: number[]): Promise<BookResult> {
  if (!isRemote) {
    const fresh = agendaStore.get().appts;
    const free = (d: number) => !fresh.some((x) => x.doc === d && x.date === b.date && x.st !== "cancelada" && b.slot < x.slot + x.dur && x.slot < b.slot + b.dur);
    const doc = b.doc ?? doctorIds.find(free) ?? null;
    if (doc === null || !free(doc)) return { ok: false, taken: true, error: "Ese horario ya fue ocupado" };
    const [a] = addAppts([{ date: b.date, doc, slot: b.slot, dur: b.dur, p: b.name, s: b.service, st: "pendiente", web: true, dni: b.dni, phone: b.phone }]);
    ensurePatient({ name: b.name, dni: b.dni, phone: b.phone, web: true });
    return { ok: true, ref: String(a.id), doc };
  }
  const { data, error } = await getClient().rpc("public_book", {
    p_slug: CLINIC_SLUG, p_doctor: b.doc, p_date: b.date, p_slot: b.slot, p_dur: b.dur, p_service: b.service, p_name: b.name, p_dni: b.dni, p_phone: b.phone,
  });
  if (error) {
    const taken = error.message.includes("slot_taken");
    return { ok: false, taken, error: taken ? "Ese horario ya fue ocupado" : BOOK_ERRORS[error.message] ?? errText(error) };
  }
  const r = data as { token: string; doctor_id: number };
  return { ok: true, ref: r.token, doc: r.doctor_id };
}

const BOOK_ERRORS: Record<string, string> = {
  too_many_pending: "Ya tienes 3 citas pendientes con este DNI. Confirma o cancela alguna para reservar otra.",
  invalid_dni: "El DNI debe tener 8 dígitos",
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
