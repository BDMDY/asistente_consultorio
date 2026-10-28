import type { DiscResult } from "./discounts";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Reparte el descuento entre las líneas de un cobro en proporción a su monto (la suma de las partes es exactamente el descuento). */
export function splitDiscount(amounts: number[], discount: number): number[] {
  const sum = amounts.reduce((n, a) => n + a, 0);
  const total = Math.min(round2(discount), round2(sum));
  if (!(sum > 0) || !(total > 0)) return amounts.map(() => 0);
  let left = total;
  return amounts.map((a, i) => {
    const part = i === amounts.length - 1 ? left : Math.min(left, round2((a / sum) * total));
    left = round2(left - part);
    return part;
  });
}

export interface DiscountedLine<T> { line: T; /** concepto con la constancia del descuento */ concept: string; /** monto realmente cobrado */ amount: number; /** parte del descuento de esta línea */ share: number }

/** Aplica un descuento a las líneas de un cobro: el monto cobrado baja y el concepto deja constancia («desc. CAMPAÑA −S/ 20»). */
export function discountLines<T extends { concept: string; amount: number }>(lines: T[], r?: DiscResult): DiscountedLine<T>[] {
  const shares = r && r.t && !r.err ? splitDiscount(lines.map((l) => l.amount), r.amt) : lines.map(() => 0);
  return lines.map((line, i) => ({
    line, share: shares[i], amount: round2(line.amount - shares[i]),
    concept: shares[i] > 0 && r ? `${line.concept} (desc. ${r.label} −S/ ${shares[i].toLocaleString("en-US")})` : line.concept,
  }));
}
