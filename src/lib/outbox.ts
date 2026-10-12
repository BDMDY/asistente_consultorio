"use client";
import { newId } from "./ids";
import { patientsStore } from "./patients";
import { defineStore } from "./store";

/**
 * Cola de mensajes salientes (WhatsApp/correo). Mientras no esté conectada la API de mensajería
 * los avisos quedan registrados aquí para enviarse cuando se active la integración.
 */
export interface OutboxItem {
  id: number;
  kind: "cancelacion" | "recordatorio" | "reprogramacion" | "campana" | "cobranza" | "comprobante" | "pedido" | "invitacion" | "demora";
  channel: "whatsapp" | "correo";
  patient: string;
  /** celular del destinatario (solo dígitos) para abrir el chat de WhatsApp */
  phone?: string;
  apptId?: number;
  text: string;
  at: string;
  status: "en-cola" | "enviado";
}

export const outboxStore = defineStore<OutboxItem[]>("da-outbox-v1", () => [], { remote: { name: "outbox", empty: () => [] } });

/** Número listo para wa.me: solo dígitos, con prefijo 51 si es un celular peruano de 9 dígitos. Vacío si no es válido. */
export function waNumber(phone: string | undefined): string {
  const d = (phone ?? "").replace(/\D/g, "");
  const n = d.length === 9 ? "51" + d : d;
  return n.length >= 11 && n.length <= 15 ? n : "";
}
export const waUrl = (phone: string | undefined, text: string) => { const n = waNumber(phone); return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : ""; };

/** Celular de un paciente por nombre (el de la ficha). */
export function phoneOfPatient(name: string): string {
  const k = name.trim().toLowerCase();
  return patientsStore.get().find((x) => x.name.trim().toLowerCase() === k)?.phone.replace(/\D/g, "") ?? "";
}

export function enqueue(item: Omit<OutboxItem, "id" | "at" | "status">, status: OutboxItem["status"] = "en-cola") {
  const phone = item.phone || (item.channel === "whatsapp" ? phoneOfPatient(item.patient) : "");
  outboxStore.update((l) => [...l, { ...item, ...(phone ? { phone } : {}), id: newId(), at: new Date().toISOString(), status }]);
}

/** Abre el chat de WhatsApp con el mensaje escrito y lo registra como enviado; sin celular lo deja en la cola. Devuelve si se abrió el chat. */
export function sendWhatsApp(item: Omit<OutboxItem, "id" | "at" | "status" | "channel">): boolean {
  const phone = item.phone || phoneOfPatient(item.patient);
  const url = waUrl(phone, item.text);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
  enqueue({ ...item, channel: "whatsapp", phone }, url ? "enviado" : "en-cola");
  return !!url;
}
