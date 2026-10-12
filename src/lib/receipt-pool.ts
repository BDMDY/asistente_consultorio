/**
 * Números de comprobante reservados en el servidor (modo remoto). Se consumen en orden y los que sobran se guardan en el
 * navegador (por usuario), para no desperdiciar números al recargar la página ni al abrir otra pestaña; al quedar pocos se pide
 * otro bloque. Sin números reservados (modo demo o sin conexión) se usa el siguiente al mayor ya emitido.
 */
let key: string | null = null;
let pool: number[] = [];
let refill: (() => void) | null = null;

const read = (): number[] => {
  if (!key) return pool;
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)).sort((a, b) => a - b) : [];
  } catch {
    return pool;
  }
};
const write = (list: number[]) => {
  pool = list;
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* sin almacenamiento: queda en memoria */ }
};

/** Activa el guardado de la reserva para este usuario y recupera lo que quedó sin usar. */
export const setPoolKey = (k: string | null) => { key = k; pool = k ? read() : []; };
export const addToPool = (first: number, count: number) => write([...new Set([...read(), ...Array.from({ length: count }, (_, i) => first + i)])].sort((a, b) => a - b));
export const setRefill = (fn: (() => void) | null) => { refill = fn; };
export const clearPool = () => { key = null; pool = []; };
export const poolSize = () => read().length;

/** Siguiente número reservado que no esté ya emitido (`usedUpTo` = mayor correlativo conocido), o undefined si no hay. */
export function takeNumber(usedUpTo = 0): number | undefined {
  const list = read().filter((n) => n > usedUpTo);
  const n = list.shift();
  write(list);
  if (list.length <= 2) refill?.();
  return n;
}
