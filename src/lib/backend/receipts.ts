"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addNumbers, addToPool, clearPool, drainPool, poolSize, setRefill, setPoolKey } from "../receipt-pool";

const BLOCK = 5;
let busy = false;

/** Pide al servidor otro bloque de números de comprobante (no se repiten entre usuarios). */
async function refill(db: SupabaseClient) {
  if (busy || poolSize() > 2) return;
  busy = true;
  try {
    // Versión 2: reutiliza los huecos que quedaron sin usar. Si el servidor aún no la tiene, se usa la anterior.
    const v2 = await db.rpc("reserve_receipt_numbers_v2", { p_n: BLOCK });
    if (!v2.error && Array.isArray(v2.data)) return addNumbers(v2.data as number[]);
    const { data, error } = await db.rpc("reserve_receipt_numbers", { p_n: BLOCK });
    if (!error && typeof data === "number") addToPool(data, BLOCK);
  } catch {
    /* sin conexión: se usa el siguiente local hasta poder reservar */
  } finally {
    busy = false;
  }
}

/** Activa la reserva de números para esta sesión. */
export function startReceiptPool(db: SupabaseClient, userId: string) {
  setPoolKey("da-receipt-pool:" + userId);
  setRefill(() => void refill(db));
  void refill(db);
}

/** Al cerrar sesión: devuelve al servidor los números que no se usaron para que se reutilicen sin dejar huecos. */
export async function releaseReceiptPool(db: SupabaseClient) {
  const nums = drainPool();
  if (!nums.length) return;
  try { await db.rpc("release_receipt_numbers", { p_nos: nums }); } catch { /* si falla, vencen solos a los 7 días */ }
}

export function stopReceiptPool() {
  setRefill(null);
  clearPool();
}
