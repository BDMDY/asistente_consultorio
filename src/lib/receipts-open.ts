"use client";
import { limaHM } from "./attention";
import { labelLong, todayISO } from "./dates";
import { plansStore } from "./clinical";
import { mediaStore, resolveMedia } from "./media";
import { type SessionGroup, sessionReceiptHtml, unitCostOf } from "./receipts";

/** Abre el comprobante de la cita en una ventana lista para imprimir o guardar como PDF. Devuelve false si el navegador bloqueó la ventana. */
export function openSessionReceipt(g: SessionGroup, o: { clinic: string; doctor?: string }): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const day = (iso: string) => labelLong(iso).replace(/^./, (c) => c.toUpperCase());
  const plans = plansStore.get(), services = resolveMedia(mediaStore.get()).services;
  w.document.write(sessionReceiptHtml(g, { ...o, unit: (p) => unitCostOf(p, plans, services), day, when: (iso) => `${day(todayISO(new Date(iso)))} ${limaHM(iso)}` }));
  w.document.close();
  return true;
}
