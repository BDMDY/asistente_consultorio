"use client";
import { newId } from "./ids";
import { defineStore } from "./store";

export const PAY_METHODS = ["Efectivo", "Yape", "Plin", "Tarjeta", "Transferencia"] as const;
export type PayMethod = (typeof PAY_METHODS)[number];

export interface Payment {
  id: number;
  /** correlativo de comprobante (demo: serie B001) */
  no: string;
  apptId?: number;
  patient: string;
  concept: string;
  amount: number;
  method: PayMethod;
  /** etiqueta de la cita cobrada */
  date: string;
  /** instante del registro */
  at: string;
  /** anulado: no cuenta en finanzas ni en reportes */
  voided?: boolean;
  /** tratamiento del plan al que se aplicó el pago, y su paciente */
  itemId?: string;
  patientId?: number;
}

export const paymentsStore = defineStore<Payment[]>("da-payments-v1", () => [], { remote: { name: "payments", empty: () => [] } });

export const money = (n: number) =>
  "S/ " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function addPayment(p: Omit<Payment, "id" | "no" | "at">): Payment {
  let created!: Payment;
  paymentsStore.update((list) => {
    created = { ...p, id: newId(), no: receiptNoFor(list, p.apptId), at: new Date().toISOString() };
    return [...list, created];
  });
  return created;
}

/** Número de comprobante para un nuevo cobro: el de la cita si ya tiene uno; si no, el siguiente de la serie. */
export const receiptNoFor = (list: Payment[], apptId?: number) =>
  (apptId !== undefined ? list.find((x) => x.apptId === apptId)?.no : undefined) ?? "B001-" + String(list.length + 124).padStart(6, "0");

/** Cobro de varios tratamientos en una misma sesión: un comprobante por cita, con una línea por tratamiento (también los cobros posteriores de esa cita). */
export function addPayments(lines: { concept: string; amount: number; itemId?: string }[], common: Omit<Payment, "id" | "no" | "at" | "concept" | "amount" | "itemId">): Payment[] {
  const out: Payment[] = [];
  paymentsStore.update((list) => {
    // Un solo comprobante por cita: si la sesión ya tiene uno, los cobros siguientes lo comparten.
    const no = receiptNoFor(list, common.apptId);
    const at = new Date().toISOString();
    for (const l of lines) out.push({ ...common, id: newId(), no, concept: l.concept, amount: l.amount, at, ...(l.itemId ? { itemId: l.itemId } : {}) });
    return [...list, ...out];
  });
  return out;
}

/** Cobros vigentes (sin los anulados). */
export const livePayments = (list: Payment[]) => list.filter((p) => !p.voided);
