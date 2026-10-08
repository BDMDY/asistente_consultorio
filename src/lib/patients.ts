"use client";
import { newId } from "./ids";
import { defineStore } from "./store";

export interface Patient {
  id: number;
  name: string;
  dni: string;
  phone: string;
  email?: string;
  /** creado desde la reserva web */
  web?: boolean;
  /** alertas médicas visibles (alergias, condiciones) */
  alerts: string[];
}

export const seedPatients = (): Patient[] => [
  { id: 1, name: "Lucía Rojas", dni: "45821367", phone: "987 654 321", email: "lucia.rojas@mail.com", alerts: ["Alergia: penicilina", "Hipertensión"] },
  { id: 2, name: "Mario Soto", dni: "40123456", phone: "986 111 222", alerts: [] },
  { id: 3, name: "Rosa León", dni: "41234567", phone: "985 222 333", alerts: [] },
  { id: 4, name: "Pedro Vera", dni: "42345678", phone: "984 333 444", alerts: ["Diabetes"] },
  { id: 5, name: "Carla Díaz", dni: "43456789", phone: "983 444 555", alerts: [] },
  { id: 6, name: "Jorge Ramos", dni: "44567890", phone: "982 555 666", alerts: [] },
  { id: 7, name: "Ana Cruz", dni: "46678901", phone: "981 666 777", alerts: [] },
  { id: 8, name: "Sofía Paz", dni: "47789012", phone: "980 777 888", alerts: [] },
  { id: 9, name: "Tomás Luna", dni: "48890123", phone: "979 888 999", alerts: [] },
];

export const patientsStore = defineStore<Patient[]>("da-patients-v1", seedPatients, { remote: { name: "patients", empty: () => [] } });

/** Crea el paciente si el DNI no existe todavía. */
export function ensurePatient(p: Pick<Patient, "name" | "dni" | "phone"> & { web?: boolean; email?: string }) {
  patientsStore.update((list) =>
    list.some((x) => x.dni === p.dni) ? list : [...list, { id: newId(), name: p.name, dni: p.dni, phone: p.phone, ...(p.email ? { email: p.email } : {}), web: p.web, alerts: [] }],
  );
}

/** Alertas médicas de un paciente por nombre exacto o apellido+inicial (las citas guardan nombres abreviados). */
export function alertsFor(list: Patient[], name: string): string[] {
  const n = (name || "").toLowerCase().trim();
  if (!n) return [];
  const last = n.split(" ").pop();
  const p = list.find((x) => x.name.toLowerCase() === n) ?? list.find((x) => x.name.toLowerCase().split(" ").pop() === last && x.name.toLowerCase()[0] === n[0]);
  return p?.alerts ?? [];
}

/** Las citas y pagos guardan el nombre; "M. Soto" corresponde a "Mario Soto" (inicial + apellido). */
export function samePatientName(stored: string, full: string): boolean {
  const a = stored.toLowerCase().trim(), b = full.toLowerCase().trim();
  if (a === b) return true;
  if (a.includes(".")) return a[0] === b[0] && a.split(" ").pop() === b.split(" ").pop();
  return false;
}

export function patchPatient(id: number, patch: Partial<Patient>) {
  patientsStore.update((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));
}
