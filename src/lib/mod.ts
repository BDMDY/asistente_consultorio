"use client";
import { useMemo } from "react";
import { isRemote } from "./backend/config";
import { defineStore } from "./store";
import { toast } from "./toast";

/** Datos de los módulos de la intranet (planes, inventario, finanzas, servicios, campañas, personal, sedes…). */
export interface PlanDiscount { t?: string; label: string; amt: number }
export interface Plan { id: string; pac: string; trat: string; svcs?: string[]; n: number; paid: number; cuota: number; base?: number; disc?: PlanDiscount }
export interface InvItem { id: string; n: string; u: string; qty: number; min: number; venc: string }
export type FinStatus = "pagado" | "pendiente" | "vencido" | "anulado";
export interface FinItem { id: string; c: string; m: string; a: number; st: FinStatus; base?: number; disc?: PlanDiscount }
export type MsgStatus = "activa" | "pausada" | "borrador";
export interface MsgSeg { t: "Todos" | "Inactivos" | "Edad" | "Inconclusos" | "Citas"; a: number; b: number }
export interface Msg { id: string; n: string; seg?: MsgSeg; aud: string; link?: string; lp?: string; txt: string; st: MsgStatus; sent: number }
export type Role = "Administrador" | "Doctor" | "Asistente";
export interface StaffUser { id: string; nom: string; dni: string; cmp: string; mail: string; tel: string; rol: Role; on: boolean; /** tratamiento del doctor: "Dr." o "Dra." */ titulo?: string; /** número de agenda del doctor (columna de la agenda y de la reserva) */ agenda?: number }
export interface Sede { id: string; n: string; dir: string; h: string }
export interface NotifPrefs { wa24: boolean; wa2: boolean; mail: boolean; resumen: boolean }
export interface DiscountCode { id: string; code: string; type: "%" | "S/"; val: number; max: number; used: number; on: boolean }
export interface DiscountCamp { id: string; n: string; type: "%" | "S/"; val: number; ap: string; from: string; to: string; on: boolean }

export interface ModData {
  planes: Plan[];
  inv: InvItem[];
  fin: FinItem[];
  msg: Msg[];
  users: StaffUser[];
  sedes: Sede[];
  notif: NotifPrefs;
  desc: { codes: DiscountCode[]; camps: DiscountCamp[] };
  sent: number;
}

export const seedMod = (): ModData => ({
  planes: [
    { id: "p1", pac: "Lucía Rojas", trat: "Ortodoncia", n: 24, paid: 8, cuota: 350 },
    { id: "p2", pac: "Carlos Vera", trat: "Implante", n: 3, paid: 2, cuota: 1200 },
    { id: "p3", pac: "Ana Cruz", trat: "Blanqueamiento", n: 2, paid: 1, cuota: 280 },
    { id: "p4", pac: "Mario Soto", trat: "Rehabilitación", n: 4, paid: 1, cuota: 400 },
  ],
  inv: [
    { id: "i1", n: "Resina A2", u: "g", qty: 3, min: 10, venc: "" },
    { id: "i2", n: "Brackets metálicos", u: "unid.", qty: 18, min: 40, venc: "" },
    { id: "i3", n: "Anestesia lidocaína", u: "ml", qty: 25, min: 10, venc: "2026-11-12" },
    { id: "i4", n: "Guantes M", u: "cajas", qty: 34, min: 20, venc: "" },
  ],
  fin: [
    { id: "f1", c: "Lucía Rojas · Cuota 8", m: "Yape", a: 350, st: "pagado" },
    { id: "f2", c: "Carlos Vera · Implante", m: "Tarjeta", a: 1200, st: "pagado" },
    { id: "f3", c: "Ana Cruz · Saldo", m: "", a: 280, st: "pendiente" },
    { id: "f4", c: "Mario Soto · Cuota 3", m: "", a: 400, st: "vencido" },
  ],
  msg: [
    { id: "m1", n: "Recordatorio de cita", seg: { t: "Citas", a: 0, b: 2 }, aud: "Cita en 0–2 días", link: "Confirmar cita", lp: "", txt: "Hola {nombre}, te esperamos pronto a las {hora}. Confirma tu cita aquí:", st: "activa", sent: 0 },
    { id: "m2", n: "Control semestral", aud: "Pacientes activos", txt: "Hola {nombre}, ya toca tu control. Reserva aquí.", st: "activa", sent: 0 },
    { id: "m3", n: "Promoción blanqueamiento", aud: "Todos", txt: "20% en blanqueamiento este mes.", st: "borrador", sent: 0 },
  ],
  users: [
    { id: "u1", nom: "Ana Quispe Huamán", dni: "40123456", cmp: "45821", mail: "ana@clinicasonrie.pe", tel: "987654321", rol: "Doctor", on: true, agenda: 1, titulo: "Dra." },
    { id: "u2", nom: "Luis Paredes Salazar", dni: "41234567", cmp: "51376", mail: "luis@clinicasonrie.pe", tel: "986543210", rol: "Doctor", on: true, agenda: 2, titulo: "Dr." },
    { id: "u5", nom: "Carla Vega Ríos", dni: "42345678", cmp: "34567", mail: "carla@clinicasonrie.pe", tel: "985432100", rol: "Doctor", on: true, agenda: 3, titulo: "Dra." },
    { id: "u3", nom: "Rosa Medina Flores", dni: "45678901", cmp: "", mail: "recepcion@clinicasonrie.pe", tel: "985432109", rol: "Asistente", on: true },
    { id: "u4", nom: "Ana Cruz Torres", dni: "45218790", cmp: "", mail: "admin@clinicasonrie.pe", tel: "984321098", rol: "Administrador", on: true },
  ],
  sedes: [
    { id: "z1", n: "Sede Miraflores", dir: "Av. Larco 345", h: "Lun–Sáb 9:00–19:00" },
    { id: "z2", n: "Sede San Isidro", dir: "Av. Javier Prado 1020", h: "Lun–Vie 9:00–18:00" },
  ],
  notif: { wa24: true, wa2: true, mail: false, resumen: true },
  desc: {
    codes: [
      { id: "k1", code: "BIENVENIDA10", type: "%", val: 10, max: 0, used: 3, on: true },
      { id: "k2", code: "CONTROL20", type: "%", val: 20, max: 50, used: 12, on: true },
      { id: "k3", code: "REFIERE30", type: "S/", val: 30, max: 0, used: 1, on: true },
    ],
    camps: [
      { id: "g1", n: "Mes de la sonrisa", type: "%", val: 15, ap: "Todos los servicios", from: "2026-10-01", to: "2026-10-31", on: true },
      { id: "g2", n: "Blanqueamiento de verano", type: "%", val: 20, ap: "Blanqueamiento", from: "2026-12-01", to: "2027-02-28", on: false },
    ],
  },
  sent: 0,
});

/** Empresa nueva (modo remoto): sin datos de ejemplo. */
export const emptyMod = (): ModData => ({
  planes: [], inv: [], fin: [], msg: [], users: [], sedes: [],
  notif: { wa24: true, wa2: true, mail: false, resumen: true },
  desc: { codes: [], camps: [] },
  sent: 0,
});

export const modStore = defineStore<ModData>("da-mod-v2", seedMod, { remote: { name: "mod", empty: emptyMod } });

export const stockLow = (m: ModData) => m.inv.filter((i) => i.qty < i.min);
export const pendingCharges = (m: ModData) => m.fin.filter((f) => f.st === "pendiente" || f.st === "vencido");

export function useMod() {
  const [m] = modStore.useStore();
  return useMemo(() => ({ data: m, low: stockLow(m), pending: pendingCharges(m) }), [m]);
}

/** Administrador activo (perfil que se muestra en el menú). */
export const adminOf = (m: ModData) => m.users.find((u) => u.rol === "Administrador" && u.on);
export const initialsOf = (name: string) => name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Guarda cambios del módulo y avisa; si se pasa `undo` (estado previo) ofrece deshacer. */
export function saveMod(next: ModData, msg?: string, undo?: ModData) {
  modStore.set(next);
  if (msg) toast(msg, undo ? () => modStore.set(undo) : undefined);
}

export const money0 = (n: number) => "S/ " + Number(n || 0).toLocaleString("en-US");
/** Identificador de registros de módulos; en modo remoto es un UUID (las fichas de personal lo exigen). */
export const uid = () => (isRemote ? crypto.randomUUID() : "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
