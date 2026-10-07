"use client";
import { useSyncExternalStore } from "react";
import { todayISO } from "./dates";

const noop = () => () => {};

/** true solo en el cliente, ya hidratado (evita desajustes de hidratación sin setState en efectos). */
export const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/** Fecha de hoy en Lima; cadena vacía durante el render del servidor. */
export const useToday = () => useSyncExternalStore(noop, () => todayISO(), () => "");
