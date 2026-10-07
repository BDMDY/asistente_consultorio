"use client";
import type { Role } from "./mod";
import { defineStore } from "./store";

/** Matriz de permisos por módulo: [nombre, Administrador, Doctor, Asistente]. El administrador siempre tiene acceso total. */
export type PermRow = [string, 0 | 1, 0 | 1, 0 | 1];

export const seedPerms = (): PermRow[] => [
  ["Agenda", 1, 1, 1],
  ["Pacientes", 1, 1, 1],
  ["Planes de tratamiento", 1, 1, 0],
  ["Inventario", 1, 0, 1],
  ["Finanzas", 1, 0, 0],
  ["Servicios", 1, 0, 1],
  ["Mensajes y campañas", 1, 0, 1],
  ["Reportes", 1, 0, 0],
  ["Configuración", 1, 0, 0],
];

export const permsStore = defineStore<PermRow[]>("da-perms-v1", seedPerms, { remote: { name: "perms", empty: seedPerms } });

const COL: Record<Role, 1 | 2 | 3> = { Administrador: 1, Doctor: 2, Asistente: 3 };

export function canAccess(perms: PermRow[], role: Role | undefined, module: string): boolean {
  if (!role) return false;
  if (role === "Administrador") return true;
  const row = perms.find((r) => r[0] === module);
  return !!row && row[COL[role]] === 1;
}
