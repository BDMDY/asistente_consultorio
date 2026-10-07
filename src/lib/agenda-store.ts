"use client";
import { type Appt, type AgendaState, seedAgenda } from "./agenda";
import { defineStore } from "./store";

export const agendaStore = defineStore<AgendaState>("da-agenda-v2", () => seedAgenda(), { remote: { name: "agenda", empty: () => ({ appts: [], nid: 0 }) } });

export function addAppts(items: Omit<Appt, "id">[]): Appt[] {
  let created: Appt[] = [];
  agendaStore.update((s) => {
    let id = Math.max(s.nid, ...s.appts.map((a) => a.id));
    created = items.map((a) => ({ ...a, id: ++id }));
    return { appts: s.appts.concat(created), nid: id };
  });
  return created;
}

export function patchAppt(id: number, patch: Partial<Appt>) {
  agendaStore.update((s) => ({ ...s, appts: s.appts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
}

export function removeAppts(ids: number[]) {
  agendaStore.update((s) => ({ ...s, appts: s.appts.filter((a) => !ids.includes(a.id)) }));
}
