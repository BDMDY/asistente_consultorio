"use client";
import { type Appt, type AgendaState, seedAgenda } from "./agenda";
import { isRemote } from "./backend/config";
import { newId } from "./ids";
import { defineStore } from "./store";

export const agendaStore = defineStore<AgendaState>("da-agenda-v3", () => seedAgenda(), { remote: { name: "agenda", empty: () => ({ appts: [], nid: 0 }) } });

export function addAppts(items: Omit<Appt, "id">[]): Appt[] {
  let created: Appt[] = [];
  agendaStore.update((s) => {
    let id = Math.max(s.nid, ...s.appts.map((a) => a.id));
    // En modo remoto los ids son únicos por tiempo (varios usuarios crean a la vez); en demo, correlativos.
    created = items.map((a) => ({ ...a, id: isRemote ? newId() : ++id }));
    return { appts: s.appts.concat(created), nid: isRemote ? 0 : id };
  });
  return created;
}

export function patchAppt(id: number, patch: Partial<Appt>) {
  agendaStore.update((s) => ({ ...s, appts: s.appts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

export function removeAppts(ids: number[]) {
  agendaStore.update((s) => ({ ...s, appts: s.appts.filter((a) => !ids.includes(a.id)) }));
}
