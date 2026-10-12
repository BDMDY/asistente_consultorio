/**
 * Números de comprobante reservados en el servidor (modo remoto). Se consumen en orden; al quedar pocos se pide otro bloque.
 * Sin números reservados (modo demo o sin conexión) se usa el siguiente al mayor ya emitido.
 */
let pool: number[] = [];
let refill: (() => void) | null = null;

export const addToPool = (first: number, count: number) => { for (let i = 0; i < count; i++) pool.push(first + i); };
export const setRefill = (fn: (() => void) | null) => { refill = fn; };
export const clearPool = () => { pool = []; };
export const poolSize = () => pool.length;

/** Siguiente número reservado, o undefined si no hay. */
export function takeNumber(): number | undefined {
  const n = pool.shift();
  if (pool.length <= 2) refill?.();
  return n;
}
