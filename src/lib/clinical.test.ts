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
