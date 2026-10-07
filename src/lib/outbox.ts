"use client";
import { defineStore } from "./store";

/**
 * Cola de mensajes salientes (WhatsApp/correo). Mientras no esté conectada la API de mensajería
 * los avisos quedan registrados aquí para enviarse cuando se active la integración.
 */
export interface OutboxItem {
  id: number;
  kind: "cancelacion" | "recordatorio" | "reprogramacion" | "campana";
  channel: "whatsapp" | "correo";
  patient: string;
  apptId?: number;
  text: string;
  at: string;
  status: "en-cola" | "enviado";
}

export const outboxStore = defineStore<OutboxItem[]>("da-outbox-v1", () => []);

export function enqueue(item: Omit<OutboxItem, "id" | "at" | "status">) {
  outboxStore.update((l) => [...l, { ...item, id: Date.now() + l.length, at: new Date().toISOString(), status: "en-cola" }]);
}
