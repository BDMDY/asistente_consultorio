"use client";
import { useSyncExternalStore } from "react";
import { limaMinutesNow, todayISO } from "./dates";

const noop = () => () => {};

/** true solo en el cliente, ya hidratado (evita desajustes de hidratación sin setState en efectos). */
export const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/** Fecha de hoy en Lima; cadena vacía durante el render del servidor. */
export const useToday = () => useSyncExternalStore(noop, () => todayISO(), () => "");

/** Minutos desde la medianoche en Lima, actualizados cada 20 s; -1 durante el render del servidor. */
export const useNowMin = () =>
  useSyncExternalStore(
    (cb) => {
      const t = setInterval(cb, 20000);
      return () => clearInterval(t);
    },
    () => limaMinutesNow(),
    () => -1,
  );
