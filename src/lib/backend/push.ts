"use client";
import { useEffect, useState } from "react";
import { getClient } from "./client";
import { isRemote } from "./config";

/** Clave pública VAPID (se define en Vercel como NEXT_PUBLIC_VAPID_PUBLIC_KEY). Sin ella las notificaciones no se pueden activar. */
const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState = "cargando" | "no-disponible" | "sin-configurar" | "bloqueado" | "apagado" | "activo";

const b64 = (s: string) => {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const toB64 = (buf: ArrayBuffer | null) => (buf ? btoa(String.fromCharCode(...new Uint8Array(buf))) : "");

const supported = () => typeof window !== "undefined" && isRemote && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function pushState(): Promise<PushState> {
  if (!supported()) return "no-disponible";
  if (!VAPID) return "sin-configurar";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "activo" : "apagado";
  } catch {
    return "apagado";
  }
}

/** Activa las notificaciones en este dispositivo: pide permiso, se suscribe y guarda la suscripción del usuario. */
export async function enablePush(): Promise<string> {
  if (!supported() || !VAPID) return "Este dispositivo no admite notificaciones o aún no están configuradas.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Permiso denegado. Actívalo desde los ajustes del navegador para este sitio.";
  try {
    const db = getClient();
    const userId = (await db.auth.getUser()).data.user?.id;
    const clinicId = userId ? ((await db.from("staff").select("clinic_id").eq("user_id", userId).eq("active", true).limit(1).maybeSingle()).data?.clinic_id as string | undefined) : undefined;
    if (!userId || !clinicId) return "Tu cuenta aún no está asociada a una clínica.";
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID) }));
    const { error } = await db.from("push_subscriptions").upsert(
      { clinic_id: clinicId, user_id: userId, endpoint: sub.endpoint, p256dh: toB64(sub.getKey("p256dh")), auth: toB64(sub.getKey("auth")) },
      { onConflict: "endpoint" },
    );
    return error ? "No se pudo guardar la suscripción. Intenta de nuevo." : "";
  } catch {
    return "No se pudo activar. En iPhone, instala primero la app («Agregar a pantalla de inicio»).";
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await getClient().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch { /* nada que apagar */ }
}

export function usePushState(): [PushState, () => void] {
  const [s, set] = useState<PushState>("cargando");
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    void pushState().then((v) => { if (live) set(v); });
    return () => { live = false; };
  }, [n]);
  return [s, () => setN((x) => x + 1)];
}
