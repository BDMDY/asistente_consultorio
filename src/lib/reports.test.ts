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
  it("ingresos por servicio ordenados", () => {
    expect(r.reports.find((x) => x.id === "ing")!.bars).toEqual([["Ortodoncia", 500], ["Limpieza", 90]]);
  });
  it("ocupación por doctor sobre la capacidad", () => {
    const cap = openDays(r.range) * 32;
    expect(r.reports.find((x) => x.id === "ocu")!.bars[0]).toEqual(["Quispe", Math.round((16 / cap) * 100)]);
  });
  it("cancelaciones por motivo, con y sin motivo", () => {
    expect(r.reports.find((x) => x.id === "can")!.bars).toEqual([["Lo pidió el paciente", 1], ["Sin motivo registrado", 1]]);
    expect(cancelReason({ notes: "x · Cancelada: No contestó" })).toBe("No contestó");
  });
  it("pacientes nuevos solo con fecha de registro conocida", () => {
    expect(createdDateOfId(3)).toBeNull();
    expect(createdDateOfId(1791496962844852)).toBe("2026-10-08");
  });
});
