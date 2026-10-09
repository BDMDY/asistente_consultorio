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
}

export const paymentsStore = defineStore<Payment[]>("da-payments-v1", () => [], { remote: { name: "payments", empty: () => [] } });

export const money = (n: number) =>
  "S/ " + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function addPayment(p: Omit<Payment, "id" | "no" | "at">): Payment {
  let created!: Payment;
  paymentsStore.update((list) => {
    created = { ...p, id: newId(), no: "B001-" + String(list.length + 124).padStart(6, "0"), at: new Date().toISOString() };
    return [...list, created];
  });
  return created;
}

/** Cobro de varios tratamientos en una misma sesión: un comprobante con una línea por tratamiento. */
export function addPayments(lines: { concept: string; amount: number }[], common: Omit<Payment, "id" | "no" | "at" | "concept" | "amount">): Payment[] {
  const out: Payment[] = [];
  paymentsStore.update((list) => {
    const no = "B001-" + String(list.length + 124).padStart(6, "0");
    const at = new Date().toISOString();
    for (const l of lines) out.push({ ...common, id: newId(), no, concept: l.concept, amount: l.amount, at });
    return [...list, ...out];
  });
  return out;
}
