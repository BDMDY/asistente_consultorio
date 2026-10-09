import { describe, expect, it } from "vitest";
import { paymentsInRange, sumLive, totalsByMethod } from "./finance";
import type { Payment } from "./payments";

const pay = (id: number, at: string, amount: number, method: Payment["method"], extra: Partial<Payment> = {}): Payment => ({ id, no: "B001-" + id, patient: "X", concept: "Limpieza", amount, method, date: "", at, ...extra });
const L = (iso: string) => new Date(iso + "T15:00:00Z").toISOString(); // 10:00 en Lima

describe("finanzas", () => {
  const list = [pay(1, L("2026-10-12"), 100, "Yape"), pay(2, L("2026-10-13"), 250, "Efectivo"), pay(3, "2026-10-13T16:30:00Z", 90, "Yape", { voided: true }), pay(4, L("2026-09-30"), 500, "Tarjeta")];
  it("filtra por fecha de Lima y ordena de lo más reciente a lo más antiguo", () => {
    const r = paymentsInRange(list, { from: "2026-10-01", to: "2026-10-31" });
    expect(r.map((p) => p.id)).toEqual([3, 2, 1]);
    expect(paymentsInRange(list, null)).toHaveLength(4);
    expect(paymentsInRange(list, { from: "2026-10-13", to: "2026-10-13" }).map((p) => p.id)).toEqual([3, 2]);
  });
  it("los cobros anulados no suman", () => {
    expect(sumLive(list)).toBe(850);
    expect(sumLive(paymentsInRange(list, { from: "2026-10-01", to: "2026-10-31" }))).toBe(350);
  });
  it("total por método de pago, solo cobros vigentes", () => {
    expect(Object.fromEntries(totalsByMethod(list))).toMatchObject({ Yape: 100, Efectivo: 250, Tarjeta: 500, Plin: 0 });
  });
});
