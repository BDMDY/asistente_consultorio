import { describe, expect, it } from "vitest";
import { contrast, deriveBrand } from "./color";

describe("deriveBrand", () => {
  it("devuelve la escala completa y conserva el color base en 500", () => {
    const v = deriveBrand("#2F6FDE");
    expect(Object.keys(v)).toHaveLength(11);
    expect(v["--brand-500"]).toBe("#2F6FDE");
  });
  it("el paso 700 cumple AA con texto blanco para cualquier color", () => {
    for (const c of ["#00A86B", "#F5A524", "#FFE600", "#7440DD", "#DC4D2D"]) {
      expect(contrast(deriveBrand(c)["--brand-700"], "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("usa jade por defecto si el color es inválido", () => {
    expect(deriveBrand("xx")["--brand-500"]).toBe("#00A86B");
  });
});
