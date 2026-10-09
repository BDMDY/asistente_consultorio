import { describe, expect, it } from "vitest";
import { matError, matUseOf } from "./materials";
import type { InvItem } from "./mod";

const inv: InvItem[] = [{ id: "a", n: "Resina A2", u: "g", qty: 3, min: 10, venc: "" }, { id: "b", n: "Guantes M", u: "cajas", qty: 34, min: 20, venc: "" }];

describe("liquidación de materiales", () => {
  it("valida cantidades contra el stock", () => {
    expect(matError(inv, [{ invId: "a", qty: 2 }, { invId: "b", qty: 1 }])).toBeNull();
    expect(matError(inv, [{ invId: "a", qty: 4 }])).toMatch(/No hay tanto stock de Resina A2/);
    expect(matError(inv, [{ invId: "b", qty: 0 }])).toMatch(/cantidad de Guantes M/);
    expect(matError(inv, [{ invId: "z", qty: 1 }])).toMatch(/ya no está/);
  });
  it("encuentra la liquidación de una cita", () => {
    const m = { id: "1", apptId: 7, at: "", patient: "Ana", service: "Limpieza", lines: [] };
    expect(matUseOf([m], 7)).toBe(m);
    expect(matUseOf([m], 8)).toBeUndefined();
    expect(matUseOf(undefined, 7)).toBeUndefined();
  });
});
