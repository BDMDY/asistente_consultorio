import { describe, expect, it } from "vitest";
import { discountLines, splitDiscount } from "./charge-discount";
import { type TreatmentPlan, applyLines, discountItems, itemBalance, planItems } from "./clinical";
import { NO_DISCOUNT, computeDiscount } from "./discounts";
import type { ModData } from "./mod";

const desc: ModData["desc"] = {
  codes: [{ id: "k1", code: "CONTROL20", type: "%", val: 20, max: 0, used: 0, on: true }],
  camps: [{ id: "g1", n: "Mes de la sonrisa", type: "S/", val: 30, ap: "Todos", from: "", to: "", on: true }],
};

describe("descuento en un cobro", () => {
  it("reparte el descuento entre las líneas sin perder ni inventar centavos", () => {
    const parts = splitDiscount([100, 50, 33.33], 25);
    expect(parts.reduce((n, x) => n + x, 0)).toBeCloseTo(25, 2);
    expect(parts.every((x, i) => x <= [100, 50, 33.33][i])).toBe(true);
    expect(splitDiscount([10, 10], 50)).toEqual([10, 10]); // nunca más que el monto
    expect(splitDiscount([0, 0], 5)).toEqual([0, 0]);
  });
  it("baja el monto cobrado y deja constancia en el concepto", () => {
    const r = computeDiscount(150, { ...NO_DISCOUNT, mode: "Código", code: "control20" }, desc);
    expect(r.amt).toBe(30);
    const dl = discountLines([{ concept: "Limpieza", amount: 100 }, { concept: "Resina", amount: 50 }], r);
    expect(dl.map((d) => d.amount)).toEqual([80, 40]);
    expect(dl[0].concept).toBe("Limpieza (desc. CONTROL20 −S/ 20)");
    expect(dl.reduce((n, d) => n + d.amount, 0)).toBe(120);
  });
  it("sin descuento o con error no cambia nada", () => {
    const base = discountLines([{ concept: "Consulta", amount: 50 }]);
    expect(base[0]).toMatchObject({ amount: 50, share: 0, concept: "Consulta" });
    const bad = computeDiscount(50, { ...NO_DISCOUNT, mode: "Código", code: "NOEXISTE" }, desc);
    expect(discountLines([{ concept: "Consulta", amount: 50 }], bad)[0].amount).toBe(50);
  });
  it("la campaña en soles y el manual funcionan igual", () => {
    const camp = computeDiscount(100, { ...NO_DISCOUNT, mode: "Campaña", camp: "Mes de la sonrisa" }, desc);
    expect(discountLines([{ concept: "X", amount: 100 }], camp)[0].amount).toBe(70);
    const man = computeDiscount(100, { ...NO_DISCOUNT, mode: "Manual", type: "%", val: 10, motive: "Cortesía" }, desc);
    expect(discountLines([{ concept: "X", amount: 100 }], man)[0].concept).toContain("Manual · Cortesía");
  });
  it("en el plan, el descuento baja el precio del tratamiento y el saldo sigue cuadrando", () => {
    const plan: TreatmentPlan = { name: "x", total: 4, done: 0, price: 400, paidBase: 0, items: [{ id: "a", name: "Ortodoncia", total: 4, done: 0, price: 400, paid: 0 }] };
    // sesión de S/ 100 con S/ 20 de descuento: se cobran 80
    const next = discountItems(applyLines(plan, [{ planItem: "a", amount: 80 }]), [{ id: "a", amt: 20 }]);
    const it = planItems(next)[0];
    expect(it.paid).toBe(80);
    expect(it.price).toBe(380);
    expect(itemBalance(it)).toBe(300); // quedan 3 sesiones de S/ 100
    // el precio nunca baja de lo ya pagado
    expect(planItems(discountItems(next, [{ id: "a", amt: 9999 }]))[0].price).toBe(80);
  });
});
