import { describe, expect, it } from "vitest";
import { applyMaterials, nextMatCode, parseMaterialSheet, parseQty, parseVenc } from "./bulk-materials";
import type { InvItem } from "./mod";

const inv: InvItem[] = [{ id: "a", code: "MAT-001", n: "Resina A2", u: "g", qty: 3, min: 10, venc: "" }];

describe("carga masiva de materiales", () => {
  it("lee cantidades y fechas en distintos formatos", () => {
    expect(parseQty("2,5")).toBe(2.5);
    expect(parseQty(0)).toBe(0);
    expect(parseQty("abc")).toBeNull();
    expect(parseVenc("2027-06-30")).toBe("2027-06-30");
    expect(parseVenc("5/7/2027")).toBe("2027-07-05");
    expect(parseVenc(new Date("2027-06-30T00:00:00Z"))).toBe("2027-06-30");
    expect(parseVenc("pronto")).toBeNull();
    expect(nextMatCode(inv)).toBe("MAT-002");
  });
  const sheet = [
    ["INVENTARIO"], [],
    ["Producto", "Unidad", "Cantidad", "Stock mínimo", "Vencimiento"],
    ["resina a2", "g", 20, 10, ""],
    ["Anestesia lidocaína", "ml", "50", 20, "30/06/2027"],
    ["Guantes M", "cajas", "muchos", "x", "ayer"],
  ];
  it("distingue cantidad de stock mínimo y avisa de datos dudosos", () => {
    const r = parseMaterialSheet(sheet, inv);
    expect(r.rows.map((x) => [x.name, x.action, x.qty, x.min])).toEqual([["resina a2", "actualizar", 20, 10], ["Anestesia lidocaína", "nuevo", 50, 20], ["Guantes M", "nuevo", 0, undefined]]);
    expect(r.rows[1].venc).toBe("2027-06-30");
    expect(r.rows[2].notes).toHaveLength(3);
  });
  it("suma o reemplaza el stock y asigna códigos", () => {
    const rows = parseMaterialSheet(sheet, inv).rows;
    let n = 0;
    const sum = applyMaterials(inv, rows, "sumar", () => "n" + ++n);
    expect(sum).toMatchObject({ created: 2, updated: 1 });
    expect(sum.inv.find((i) => i.id === "a")!.qty).toBe(23);
    expect(sum.inv.map((i) => i.code).sort()).toEqual(["MAT-001", "MAT-002", "MAT-003"]);
    expect(applyMaterials(inv, rows, "reemplazar", () => "z").inv.find((i) => i.id === "a")!.qty).toBe(20);
  });
});

describe("códigos del inventario existente", () => {
  it("los productos sin código lo reciben en orden y la carga masiva respeta ese orden", () => {
    const cur: InvItem[] = [{ id: "a", n: "A", u: "g", qty: 1, min: 1, venc: "" }, { id: "b", n: "B", u: "g", qty: 1, min: 1, venc: "" }];
    const rows = parseMaterialSheet([["Producto", "Cantidad"], ["B", 5], ["C", 2]], cur).rows;
    const out = applyMaterials(cur, rows, "sumar", () => "c").inv;
    expect(out.find((i) => i.id === "a")!.code).toBe("MAT-001");
    expect(out.find((i) => i.id === "b")!.code).toBe("MAT-002");
    expect(out.find((i) => i.id === "c")!.code).toBe("MAT-003");
  });
});
