"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addToPool, clearPool, poolSize, setRefill } from "../receipt-pool";

const BLOCK = 5;
let busy = false;

/** Pide al servidor otro bloque de números de comprobante (no se repiten entre usuarios). */
async function refill(db: SupabaseClient) {
  if (busy || poolSize() > 2) return;
  busy = true;
  try {
    const { data, error } = await db.rpc("reserve_receipt_numbers", { p_n: BLOCK });
    if (!error && typeof data === "number") addToPool(data, BLOCK);
  } catch {
    /* sin conexión: se usa el siguiente local hasta poder reservar */
  } finally {
    busy = false;
  }
}

/** Activa la reserva de números para esta sesión. */
export function startReceiptPool(db: SupabaseClient) {
  setRefill(() => void refill(db));
  void refill(db);
}

export function stopReceiptPool() {
  setRefill(null);
  clearPool();
}
