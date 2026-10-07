import { describe, expect, it } from "vitest";
import { computeDiscount, NO_DISCOUNT } from "./discounts";
import { seedMod } from "./mod";
import { demoPool, segCount, segLabel, segWarning } from "./segments";

const desc = seedMod().desc;

describe("descuentos", () => {
  it("sin descuento deja el total igual", () => {
    expect(computeDiscount(500, NO_DISCOUNT, desc)).toMatchObject({ amt: 0, total: 500, err: "" });
  });
  it("código porcentual y de monto fijo", () => {
    expect(computeDiscount(500, { ...NO_DISCOUNT, mode: "Código", code: "bienvenida10" }, desc)).toMatchObject({ amt: 50, total: 450, t: "code", id: "k1" });
    expect(computeDiscount(500, { ...NO_DISCOUNT, mode: "Código", code: "REFIERE30" }, desc)).toMatchObject({ amt: 30, total: 470 });
  });
  it("valida código inexistente, inactivo y agotado", () => {
    expect(computeDiscount(100, { ...NO_DISCOUNT, mode: "Código", code: "NOEXISTE" }, desc).err).toBe("El código no existe");
    const agotado = { ...desc, codes: [{ ...desc.codes[1], used: 50 }] };
    expect(computeDiscount(100, { ...NO_DISCOUNT, mode: "Código", code: "CONTROL20" }, agotado).err).toBe("El código ya se agotó");
    const off = { ...desc, codes: [{ ...desc.codes[0], on: false }] };
    expect(computeDiscount(100, { ...NO_DISCOUNT, mode: "Código", code: "BIENVENIDA10" }, off).err).toBe("El código está inactivo");
  });
  it("campaña y manual exigen datos y respetan topes", () => {
    expect(computeDiscount(200, { ...NO_DISCOUNT, mode: "Campaña", camp: "Mes de la sonrisa" }, desc)).toMatchObject({ amt: 30, total: 170 });
    expect(computeDiscount(200, { ...NO_DISCOUNT, mode: "Manual", val: 10, motive: "" }, desc).err).toBe("Indica el motivo del descuento");
    expect(computeDiscount(200, { ...NO_DISCOUNT, mode: "Manual", type: "%", val: 150, motive: "x" }, desc).err).toBe("El máximo es 100%");
    expect(computeDiscount(100, { ...NO_DISCOUNT, mode: "Manual", type: "S/", val: 500, motive: "cortesía" }, desc)).toMatchObject({ amt: 100, total: 0 });
  });
});

describe("segmentos de campañas", () => {
  const pool = demoPool();
  it("es determinista y el alcance de «Todos» es la población completa", () => {
    expect(pool).toHaveLength(120);
    expect(segCount(pool, { t: "Todos", a: 0, b: 0 })).toBe(120);
    expect(segCount(demoPool(), { t: "Edad", a: 18, b: 35 })).toBe(segCount(pool, { t: "Edad", a: 18, b: 35 }));
  });
  it("describe la audiencia y advierte configuraciones inválidas", () => {
    expect(segLabel({ t: "Edad", a: 18, b: 35 })).toBe("Edad 18–35 años");
    expect(segWarning("Confirmar cita", { t: "Todos", a: 0, b: 0 })).toMatch(/Citas próximas/);
    expect(segWarning("Sin enlace", { t: "Edad", a: 40, b: 20 })).toMatch(/desde/);
    expect(segWarning("Confirmar cita", { t: "Citas", a: 0, b: 2 })).toBe("");
  });
});
