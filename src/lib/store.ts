"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Almacén reactivo con persistencia en localStorage (modo demo).
 * Cada dominio (agenda, pacientes, marca…) define su store con una clave; la API es
 * la misma que tendrá el adaptador de Supabase, de modo que las pantallas no cambian.
 */
export function defineStore<T>(key: string, seed: () => T, opts: { session?: boolean } = {}) {
  const area = () => (opts.session ? window.sessionStorage : window.localStorage);
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let val: T | undefined;
  let serverVal: T | undefined;

  const notify = () => listeners.forEach((l) => l());

  function get(): T {
    if (typeof window === "undefined") return (serverVal ??= seed());
    let r: string | null = null;
    try {
      r = area().getItem(key);
    } catch {
      /* almacenamiento bloqueado: se usa la semilla */
    }
    if (val !== undefined && raw === r) return val;
    raw = r;
    try {
      val = r ? (JSON.parse(r) as T) : seed();
    } catch {
      val = seed();
    }
    return val as T;
  }

  function set(next: T) {
    try {
      area().setItem(key, JSON.stringify(next));
    } catch {
      /* sin persistencia */
    }
    raw = undefined;
    val = next;
    notify();
  }

  const update = (fn: (prev: T) => T) => set(fn(get()));

  function reset() {
    try {
      area().removeItem(key);
    } catch {
      /* noop */
    }
    raw = undefined;
    val = undefined;
    notify();
  }

  function subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) {
        raw = undefined;
        cb();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useStore(): [T, (next: T) => void, (fn: (prev: T) => T) => void] {
    const value = useSyncExternalStore(subscribe, get, () => (serverVal ??= seed()));
    const stableSet = useCallback(set, []);
    const stableUpdate = useCallback(update, []);
    return [value, stableSet, stableUpdate];
  }

  return { get, set, update, reset, subscribe, useStore };
}
