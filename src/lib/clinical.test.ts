import { describe, expect, it } from "vitest";
import { anamProgress, applyTool, derivedAlerts, odontogramFindings, surfaceMap, toothName } from "./clinical";

describe("odontograma", () => {
  it("marca y desmarca una superficie", () => {
    let r = applyTool({}, 16, "O", "caries");
    expect(r.teeth[16].s.O).toBe("caries");
    r = applyTool(r.teeth, 16, "O", "caries");
    expect(r.teeth[16]).toBeUndefined();
  });
  it("no permite marcar superficies de un diente ausente", () => {
    const r1 = applyTool({}, 18, undefined, "ausente");
    const r2 = applyTool(r1.teeth, 18, "V", "caries");
    expect(r2.error).toBe("El diente está marcado como ausente");
    expect(r2.teeth[18].w).toBe("ausente");
  });
  it("«sano» limpia superficies y marca completa pero conserva la nota", () => {
    let t = applyTool({}, 21, "V", "caries").teeth;
    t[21] = { ...t[21], n: "sensible al frío" };
    t = applyTool(t, 21, undefined, "sano").teeth;
    expect(t[21]).toEqual({ s: {}, w: null, n: "sensible al frío" });
  });
  it("las superficies dependen del cuadrante", () => {
    expect(surfaceMap(16)).toMatchObject({ top: "V", bottom: "P", left: "D", right: "M" });
    expect(surfaceMap(36)).toMatchObject({ top: "L", bottom: "V", left: "M", right: "D" });
  });
  it("nombra los dientes por cuadrante y dentición", () => {
    expect(toothName(16, "perm")).toBe("Diente 16 · primer molar superior derecho");
    expect(toothName(55, "temp")).toBe("Diente 55 · segundo molar superior derecho");
  });
  it("agrupa los hallazgos para el resumen", () => {
    let t = applyTool({}, 16, "O", "caries").teeth;
    t = applyTool(t, 26, undefined, "endodoncia").teeth;
    const { grp, list } = odontogramFindings(t);
    expect(grp.caries).toEqual(["16-O"]);
    expect(grp.endodoncia).toEqual(["26"]);
    expect(list).toHaveLength(2);
  });
});

describe("historia inicial", () => {
  it("calcula avance y lo que falta", () => {
    expect(anamProgress({ v: {}, yn: {} })).toMatchObject({ pct: 0, missing: "31 preguntas sin responder · falta el motivo de consulta" });
    const a = anamProgress({ v: { motivo: "dolor", antec: "x", enf: "y" }, yn: { trat: "no" } });
    expect(a.pct).toBe(Math.round((4 / 34) * 100));
  });
  it("genera alertas solo con respuestas «Sí» y usa el detalle de alergia", () => {
    const al = derivedAlerts({ v: { x_alergia: "penicilina" }, yn: { alergia: "si", diabetes: "si", asma: "no", nauseas: "si" } });
    expect(al).toEqual(["Alergia: penicilina", "Diabetes"]);
  });
});

import { addItems, advance, applyLines, itemBalance, payItem, planItems, planPaid, removeItem, sessionPrice, withItems, type TreatmentPlan } from "./clinical";

describe("plan con varios tratamientos", () => {
  const plan = withItems(undefined, [
    { id: "a", name: "Ortodoncia", total: 12, done: 3, price: 2400 },
    { id: "b", name: "Blanqueamiento", total: 2, done: 0, price: 500 },
  ]);
  it("recalcula los totales del plan", () => {
    expect(plan).toMatchObject({ name: "Ortodoncia + Blanqueamiento", total: 14, done: 3, price: 2900 });
  });
  it("un plan antiguo equivale a un solo tratamiento", () => {
    const old: TreatmentPlan = { name: "Ortodoncia con brackets", total: 18, done: 9, price: 4800, paidBase: 2400 };
    expect(planItems(old)).toEqual([{ id: "main", name: "Ortodoncia con brackets", total: 18, done: 9, price: 4800, paid: 2400 }]);
  });
  it("precio por sesión", () => {
    expect(sessionPrice(planItems(plan)[0])).toBe(200);
    expect(sessionPrice(planItems(plan)[1])).toBe(250);
  });
  it("cada tratamiento avanza por su cuenta y no pasa del total", () => {
    const p1 = advance(plan, ["a"]);
    expect(planItems(p1).map((i) => i.done)).toEqual([4, 0]);
    expect(p1.done).toBe(4);
    const full = advance(advance(plan, ["b"]), ["b", "b"]);
    expect(planItems(full)[1].done).toBe(2);
  });
  it("cada sesión suma una sesión hecha y lo cobrado a su tratamiento", () => {
    const p = applyLines(plan, [{ planItem: "a", amount: 200 }, { planItem: "b", amount: 250 }]);
    expect(planItems(p).map((i) => [i.done, i.paid])).toEqual([[4, 200], [1, 250]]);
    expect(planPaid(p)).toBe(450);
    expect(itemBalance(planItems(p)[0])).toBe(2200);
  });
  it("un pago no cuenta sesión; un plan antiguo conserva lo pagado", () => {
    const p = payItem(plan, "a", 500);
    expect(planItems(p)[0]).toMatchObject({ done: 3, paid: 500 });
    const old: TreatmentPlan = { name: "Ortodoncia", total: 18, done: 9, price: 4800, paidBase: 2400 };
    expect(planPaid(old)).toBe(2400);
    const grown = addItems(old, [{ id: "n", name: "Limpieza", total: 1, done: 0, price: 90 }]);
    expect(planItems(grown)[0].paid).toBe(2400);
    expect(grown.paidBase).toBe(0);
  });
  it("se agregan tratamientos después y se pueden quitar", () => {
    const grown = addItems(plan, [{ id: "c", name: "Endodoncia", total: 2, done: 0, price: 600 }]);
    expect(grown.total).toBe(16);
    expect(planItems(removeItem(grown, "c")!)).toHaveLength(2);
    expect(removeItem(withItems(undefined, [{ id: "x", name: "Solo", total: 1, done: 0, price: 10 }]), "x")).toBeUndefined();
  });
});
