"use client";
import { useCallback, useSyncExternalStore } from "react";
import { isRemote } from "./backend/config";
import { queueSave, registerStore } from "./backend/sync";

/**
 * Almacén reactivo con persistencia en localStorage (modo demo).
 * Cada dominio (agenda, pacientes, marca…) define su store con una clave; la API es
 * la misma que tendrá el adaptador de Supabase, de modo que las pantallas no cambian.
 */
export interface StoreOptions<T> {
  /** guarda en sessionStorage en vez de localStorage */
  session?: boolean;
  /** solo en memoria (no persiste) */
  memory?: boolean;
  /** en modo remoto el store vive en Supabase: nombre del adaptador (backend/specs.ts) y estado vacío de una empresa nueva */
  remote?: { name: string; empty: () => T };
}

export function defineStore<T>(key: string, seed: () => T, opts: StoreOptions<T> = {}) {
  const remote = isRemote && opts.remote ? opts.remote : undefined;
  if (remote) return defineRemoteStore<T>(remote);
  const area = () => (opts.session ? window.sessionStorage : window.localStorage);
  const persist = !opts.memory;
  const listeners = new Set<() => void>();
  let raw: string | null | undefined;
  let val: T | undefined;
  let serverVal: T | undefined;

  const notify = () => listeners.forEach((l) => l());

  function get(): T {
    if (typeof window === "undefined") return (serverVal ??= seed());
    if (!persist) return (val ??= seed());
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
    if (persist) try {
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
    if (persist) try {
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
    if (!persist) return () => void listeners.delete(cb);
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

  return { get, set, update, reset, subscribe, useStore, hydrate: set };
}

/** Variante conectada a Supabase: el estado vive en memoria, cada cambio se sincroniza y los cambios de otros llegan por tiempo real. */
function defineRemoteStore<T>(remote: { name: string; empty: () => T }) {
  const listeners = new Set<() => void>();
  let val: T | undefined;
  let serverVal: T | undefined;
  const notify = () => listeners.forEach((l) => l());
  const get = (): T => (typeof window === "undefined" ? (serverVal ??= remote.empty()) : (val ??= remote.empty()));
  const hydrate = (next: T) => {
    val = next;
    notify();
  };
  const reset = () => hydrate(remote.empty());

  function set(next: T) {
    const prev = get();
    if (prev === next) return;
    hydrate(next);
    queueSave(remote.name, prev, next);
  }
  const update = (fn: (prev: T) => T) => set(fn(get()));
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
  };
  function useStore(): [T, (next: T) => void, (fn: (prev: T) => T) => void] {
    const value = useSyncExternalStore(subscribe, get, () => (serverVal ??= remote.empty()));
    const stableSet = useCallback(set, []);
    const stableUpdate = useCallback(update, []);
    return [value, stableSet, stableUpdate];
  }
  registerStore(remote.name, { hydrate: hydrate as (v: unknown) => void, reset });
  return { get, set, update, reset, subscribe, useStore, hydrate };
}
