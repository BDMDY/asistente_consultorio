import { describe, expect, it } from "vitest";
import type { Appt } from "./agenda";
import type { Doctor } from "./media";
import type { Payment } from "./payments";
import { buildReports, cancelReason, createdDateOfId, openDays, periodRange } from "./reports";

const TODAY = "2026-10-14"; // miércoles
const docs: Doctor[] = [{ id: 1, name: "Dra. Ana Quispe", full: "Dra. Ana Quispe Huamán", spec: "", cop: "1", photo: "" }, { id: 2, name: "Dr. Luis Paredes", full: "Dr. Luis Paredes", spec: "", cop: "2", photo: "" }];
const A = (id: number, date: string, doc: number, dur: number, st: Appt["st"], notes?: string): Appt => ({ id, date, doc, slot: 0, dur, p: "P" + id, s: "Limpieza", st, ...(notes ? { notes } : {}) });
const pay = (id: number, at: string, concept: string, amount: number): Payment => ({ id, no: "B" + id, patient: "X", concept, amount, method: "Yape", date: "", at });
const t = (iso: string) => new Date(iso + "T15:00:00Z").toISOString();

describe("periodos", () => {
  it("semana, mes y año terminan hoy", () => {
    expect(periodRange(TODAY, 0)).toEqual({ from: "2026-10-08", to: TODAY });
    expect(periodRange(TODAY, 1)).toEqual({ from: "2026-10-01", to: TODAY });
    expect(periodRange(TODAY, 2)).toEqual({ from: "2026-01-01", to: TODAY });
  });
  it("cuenta días de atención sin domingos", () => {
    expect(openDays({ from: "2026-10-12", to: "2026-10-18" })).toBe(6);
  });
});

describe("reportes con datos reales", () => {
  const appts = [
    A(1, "2026-10-12", 1, 8, "atendida"), A(2, "2026-10-13", 1, 8, "atendida"), A(3, "2026-10-13", 2, 4, "no-show"),
    A(4, "2026-10-09", 2, 2, "cancelada", "Cancelada: Lo pidió el paciente"), A(5, "2026-10-10", 2, 2, "cancelada"), A(6, "2026-09-01", 1, 8, "atendida"),
  ];
  const payments = [pay(1, t("2026-10-12"), "Ortodoncia", 300), pay(2, t("2026-10-13"), "Ortodoncia", 200), pay(3, t("2026-10-13"), "Limpieza", 90), pay(4, t("2026-09-02"), "Implantes", 1800)];
  const patients = [{ id: 1791496962844852, name: "Nuevo", dni: "1", phone: "", alerts: [] }, { id: 3, name: "Ejemplo", dni: "2", phone: "", alerts: [] }];
  const r = buildReports({ today: TODAY, period: 1, appts, payments, patients, doctors: docs });

  it("resumen del mes", () => {
    expect(r.summary).toMatchObject({ attended: 2, noShowPct: 33, income: 590, total: 3 });
  });
  const rep = (id: string) => r.reports.find((x) => x.id === id)!;
  it("ingresos por servicio ordenados, con su porcentaje y total", () => {
    expect(rep("ing").summary.rows).toEqual([["Ortodoncia", 2, 500, 84.7], ["Limpieza", 1, 90, 15.3]]);
    expect(rep("ing").summary.total).toEqual(["Total", 3, 590, 100]);
  });
  it("ocupación por doctor sobre la capacidad", () => {
    const cap = openDays(r.range) * 32;
    expect(rep("ocu").summary.rows[0]).toEqual(["Dra. Ana Quispe Huamán", 2, 16, cap, Math.round((16 / cap) * 1000) / 10]);
  });
  it("cancelaciones por motivo, con y sin motivo", () => {
    expect(rep("can").summary.rows.map((x) => [x[0], x[1]])).toEqual([["Lo pidió el paciente", 1], ["Sin motivo registrado", 1]]);
    expect(cancelReason({ notes: "x · Cancelada: No contestó" })).toBe("No contestó");
  });
  it("servicios por día: una fila por día y servicio", () => {
    const rows = rep("sdia").summary.rows;
    expect(rows.find((x) => x[0] === "2026-10-13" && x[1] === "Limpieza")).toEqual(["2026-10-13", "Limpieza", 2, 1, 0, 90]);
    expect(rows.find((x) => x[0] === "2026-10-09")).toEqual(["2026-10-09", "Limpieza", 0, 0, 1, 0]);
  });
  it("ingresos detallados por día y método, con comprobantes", () => {
    const d = rep("ingd");
    expect(d.summary.columns).toContain("Yape (S/)");
    expect(d.summary.total![d.summary.total!.length - 1]).toBe(590);
    expect(d.detail.table.rows).toHaveLength(3);
  });
  it("servicios del periodo: citas, atendidas y cobrado por servicio", () => {
    const row = rep("serv").summary.rows.find((x) => x[0] === "Ortodoncia")!;
    expect(row.slice(5)).toEqual([2, 500, 250]);
  });
  it("rango personalizado: solo cuenta lo que cae dentro", () => {
    const c = buildReports({ today: TODAY, period: 3, custom: { from: "2026-10-13", to: "2026-10-13" }, appts, payments, patients, doctors: docs });
    expect(c.range).toEqual({ from: "2026-10-13", to: "2026-10-13" });
    expect(c.summary).toMatchObject({ attended: 1, income: 290 });
  });
  it("clientes detallado incluye citas sin ficha", () => {
    const c = rep("cli").summary.rows;
    expect(c.some((x) => x[4] === "Sin ficha")).toBe(true);
  });
  it("pacientes nuevos solo con fecha de registro conocida", () => {
    expect(createdDateOfId(3)).toBeNull();
    expect(createdDateOfId(1791496962844852)).toBe("2026-10-08");
  });
  it("los cobros anulados no entran a los reportes", () => {
    const withVoid = [...payments, { ...pay(9, t("2026-10-13"), "Limpieza", 1000), voided: true }];
    const v = buildReports({ today: TODAY, period: 1, appts, payments: withVoid, patients, doctors: docs });
    expect(v.summary.income).toBe(590);
    expect(v.reports.find((x) => x.id === "ing")!.summary.total).toEqual(["Total", 3, 590, 100]);
  });
});
