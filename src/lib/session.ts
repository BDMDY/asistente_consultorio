"use client";
import { type ModData, type StaffUser, modStore } from "./mod";
import { defineStore } from "./store";

export interface Session { userId: string; email: string }

/** Sesión de demostración. Se reemplaza por Supabase Auth en la fase de backend. */
export const sessionStore = defineStore<Session | null>("da-session-v1", () => null);

export const sedeStore = defineStore<string>("da-sede-v1", () => "Sede Miraflores");

export const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/** Usuario por correo; si no existe en la lista, entra como administrador (modo demo). */
export function demoLogin(email: string, mod: ModData): Session {
  const u = mod.users.find((x) => x.mail.toLowerCase() === email.toLowerCase() && x.on) ?? mod.users.find((x) => x.rol === "Administrador" && x.on) ?? mod.users[0];
  return { userId: u.id, email };
}

export const signIn = (email: string) => sessionStore.set(demoLogin(email, modStore.get()));
export const signOut = () => sessionStore.set(null);

export function currentUser(s: Session | null, mod: ModData): StaffUser | undefined {
  return s ? mod.users.find((u) => u.id === s.userId) : undefined;
}
