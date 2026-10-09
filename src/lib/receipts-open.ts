"use client";
import { limaHM } from "./attention";
import { labelLong, todayISO } from "./dates";
import { type SessionGroup, sessionReceiptHtml } from "./receipts";

/** Abre el comprobante de la sesión en una ventana lista para imprimir o guardar como PDF. Devuelve false si el navegador bloqueó la ventana. */
export function openSessionReceipt(g: SessionGroup, o: { clinic: string; doctor?: string }): boolean {
  const w = window.open("", "_blank");
  if (!w) return false;
  const day = (iso: string) => labelLong(iso).replace(/^./, (c) => c.toUpperCase());
  w.document.write(sessionReceiptHtml(g, { ...o, day, when: (iso) => `${day(todayISO(new Date(iso)))} ${limaHM(iso)}` }));
  w.document.close();
  return true;
}
