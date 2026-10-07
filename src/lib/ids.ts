let last = 0;

/** Identificador numérico creciente (microsegundos desde 1970; cabe en un entero seguro). Único por navegador. */
export function newId(): number {
  const n = Date.now() * 1000;
  last = n > last ? n : last + 1;
  return last;
}
