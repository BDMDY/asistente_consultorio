"use client";
import { useSyncExternalStore } from "react";

export interface ToastState { text: string; undo?: () => void; id: number }

let state: ToastState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Muestra un aviso breve; con `undo` ofrece deshacer y dura más (8 s). */
export function toast(text: string, undo?: () => void) {
  clearTimeout(timer);
  state = { text, undo, id: Date.now() };
  emit();
  timer = setTimeout(dismissToast, undo ? 8000 : 4500);
}

export function dismissToast() {
  clearTimeout(timer);
  state = null;
  emit();
}

export const useToast = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => null,
  );
