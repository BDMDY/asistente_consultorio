"use client";
import { type StaffUser, modStore } from "./mod";
import { type Doctor, type Media, resolveMedia, useMedia } from "./media";
import { defineStore } from "./store";
import { useMemo } from "react";

/** Doctor visible sin sesión (sitio público): número de agenda, nombre y COP que publica la clínica. */
export interface PublicDoctor { id: number; nom: string; cmp: string; titulo?: string }
export const publicDoctorsStore = defineStore<PublicDoctor[]>("da-pubdocs-v1", () => [], { memory: true, remote: { name: "pubdoctors", empty: () => [] } });

/** "Ana Quispe Huamán" → "Ana Quispe"; con cuatro palabras o más toma el primer nombre y el primer apellido ("Carmen Rosa Quispe Huamán" → "Carmen Quispe"). */
export function shortName(nom: string): string {
  const w = nom.trim().split(/\s+/).filter(Boolean);
  if (w.length <= 2) return w.join(" ");
  return w.length >= 4 ? `${w[0]} ${w[2]}` : `${w[0]} ${w[1]}`;
}

export const displayName = (nom: string, title?: string) => [title?.trim(), shortName(nom)].filter(Boolean).join(" ");

/**
 * Doctores de la clínica = usuarios activos con perfil Doctor. Su perfil público (título, especialidad, foto)
 * viene de Medios de marca, enlazado por el número de agenda. Un doctor sin número (datos antiguos) toma el siguiente libre.
 */
export function resolveDoctors(users: StaffUser[], media: Media, pub: PublicDoctor[] = []): Doctor[] {
  const docs = users.filter((u) => u.rol === "Doctor" && u.on);
  if (!docs.length) return pub.map((p) => toDoctor(p.id, p.nom, p.cmp, media, p.titulo));
  const used = new Set(docs.map((u) => u.agenda).filter((n): n is number => !!n));
  let next = 1;
  const free = () => {
    while (used.has(next)) next++;
    used.add(next);
    return next;
  };
  return docs.map((u) => toDoctor(u.agenda ?? free(), u.nom, u.cmp, media, u.titulo)).sort((a, b) => a.id - b.id);
}

function toDoctor(id: number, nom: string, cmp: string, media: Media, titulo?: string): Doctor {
  const p = media.docs.find((x) => x.id === id);
  const title = titulo?.trim() || p?.title;
  return { id, name: displayName(nom, title), full: [title?.trim(), nom.trim()].filter(Boolean).join(" "), spec: p?.spec ?? "", cop: cmp, photo: p?.photo ?? "" };
}

/** Siguiente número de agenda libre para un doctor nuevo. */
export const nextAgenda = (users: StaffUser[]) => Math.max(0, ...users.map((u) => u.agenda ?? 0)) + 1;

export function useDoctors(): Doctor[] {
  const media = useMedia();
  const [mod] = modStore.useStore();
  const [pub] = publicDoctorsStore.useStore();
  return useMemo(() => resolveDoctors(mod.users, resolveMedia(media), pub), [mod.users, media, pub]);
}
