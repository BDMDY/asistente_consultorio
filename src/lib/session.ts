"use client";
import { type ModData, type StaffUser, modStore } from "./mod";
import { signOutRemote } from "./backend/auth";
import { isRemote } from "./backend/config";
import { defineStore } from "./store";

export interface Session { userId: string; email: string }

/** Sesión de demostración. Se reemplaza por Supabase Auth en la fase de backend. */
export const sessionStore = defineStore<Session | null>("da-session-v1", () => null, { memory: isRemote });

/** Sede activa elegida en el menú ("" = la primera). */
export const sedeStore = defineStore<string>("da-sede-v1", () => "");

/** La sede elegida solo vale si sigue existiendo en Configuración → Sedes; si no, se usa la primera registrada. */
export const resolveSede = (chosen: string, sedes: string[]) => (sedes.includes(chosen) ? chosen : (sedes[0] ?? ""));

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/** Usuario por correo; si no existe en la lista, entra como administrador (modo demo). */
export function demoLogin(email: string, mod: ModData): Session {
  const u = mod.users.find((x) => x.mail.toLowerCase() === email.toLowerCase() && x.on) ?? mod.users.find((x) => x.rol === "Administrador" && x.on) ?? mod.users[0];
  return { userId: u.id, email };
}

export const signIn = (email: string) => sessionStore.set(demoLogin(email, modStore.get()));
export function signOut() {
  if (isRemote) void signOutRemote();
  sessionStore.set(null);
}

export function currentUser(s: Session | null, mod: ModData): StaffUser | undefined {
  return s ? mod.users.find((u) => u.id === s.userId) : undefined;
}
