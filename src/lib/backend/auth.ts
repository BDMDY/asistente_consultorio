"use client";
import type { Session as SbSession } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { sessionStore } from "../session";
import { getClient } from "./client";
import { CLINIC_SLUG, isRemote } from "./config";
import { loadPublic, refreshAll, refreshIfStale, resetAll, setCtx, startRealtime, stopRealtime } from "./sync";
import { registerSpecs } from "./specs";

/** loading: comprobando · anon: sin sesión · denied: con cuenta pero sin ficha de personal · ready: datos cargados */
export type AuthStatus = "off" | "loading" | "anon" | "denied" | "ready";
export interface AuthState { status: AuthStatus; email?: string }

let state: AuthState = { status: isRemote ? "loading" : "off" };
const listeners = new Set<() => void>();
const set = (s: AuthState) => {
  state = s;
  listeners.forEach((l) => l());
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};
/** Actualiza los datos de la empresa (se usa al entrar a cada módulo). */
export const refreshData = () => (isRemote ? refreshIfStale(2000) : Promise.resolve());
export const getAuth = () => state;
export const useAuth = () => useSyncExternalStore(subscribe, () => state, () => state);

let started = false;
let readyFor: string | null = null;
let entering: Promise<void> | null = null;

async function enter(session: SbSession | null) {
  const db = getClient();
  if (!session) {
    readyFor = null;
    stopRealtime(db);
    setCtx(null);
    resetAll();
    sessionStore.set(null);
    set({ status: "anon" });
    await loadPublic(db, CLINIC_SLUG);
    return;
  }
  if (readyFor === session.user.id) return;
  set({ status: "loading", email: session.user.email });
  const { data, error } = await db.from("staff").select("id, clinic_id").eq("user_id", session.user.id).eq("active", true).limit(1);
  const row = data?.[0] as { id: string; clinic_id: string } | undefined;
  if (error || !row) {
    setCtx(null);
    resetAll();
    sessionStore.set(null);
    set({ status: "denied", email: session.user.email });
    await loadPublic(db, CLINIC_SLUG);
    return;
  }
  const ctx = { db, clinicId: row.clinic_id };
  setCtx(ctx);
  await refreshAll();
  sessionStore.set({ userId: row.id, email: session.user.email ?? "" });
  readyFor = session.user.id;
  startRealtime(ctx);
  set({ status: "ready", email: session.user.email });
}

/** Arranca la conexión (una vez): sesión, datos de la empresa y tiempo real. En modo demo no hace nada. */
export function initBackend() {
  if (!isRemote || started) return;
  started = true;
  registerSpecs();
  const db = getClient();
  // Al volver a la pestaña se actualiza lo que haya cambiado mientras tanto.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refreshIfStale(10000);
  });
  db.auth.onAuthStateChange((event, session) => {
    // No se llama a la base dentro del callback (puede bloquear el cliente de autenticación).
    setTimeout(() => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      entering = (entering ?? Promise.resolve()).then(() => enter(session)).catch(() => set({ status: "anon" }));
    }, 0);
  });
}

export const signInWithPassword = async (email: string, password: string) => (await getClient().auth.signInWithPassword({ email, password })).error;
export const signOutRemote = async () => void (await getClient().auth.signOut());
export const sendReset = async (email: string) => (await getClient().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/intranet/nueva-clave" })).error;
export const updatePassword = async (password: string) => (await getClient().auth.updateUser({ password })).error;
export const signUp = async (email: string, password: string) => {
  const { data, error } = await getClient().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/intranet/registro" } });
  return { error, needsConfirm: !error && !data.session };
};
export async function bootstrapClinic(a: { code: string; slug: string; name: string; nom: string; dni: string; tel: string }) {
  const db = getClient();
  const { error } = await db.rpc("bootstrap_clinic", { p_code: a.code, p_slug: a.slug, p_name: a.name, p_nom: a.nom, p_dni: a.dni, p_tel: a.tel });
  if (error) return error;
  readyFor = null;
  const { data } = await db.auth.getSession();
  entering = (entering ?? Promise.resolve()).then(() => enter(data.session));
  await entering;
  return null;
}
