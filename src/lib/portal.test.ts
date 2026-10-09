import { describe, expect, it } from "vitest";
import { type PortalData, buildTimeline, receiptsOf } from "./portal";

const at = (d: string, h: number) => new Date(`${d}T${String(h + 5).padStart(2, "0")}:00:00Z`).toISOString(); // hora de Lima
const data: PortalData = {
  name: "Ana Pérez", verified: true, hasBirth: true, plan: [],
  appts: [
    { id: 1, ref: "r1", date: "2026-10-05", slot: 36, dur: 2, service: "Limpieza", status: "atendida", doc: 1 },
    { id: 2, ref: "r2", date: "2026-10-12", slot: 40, dur: 2, service: "Control", status: "confirmada", doc: 1 },
  ],
  payments: [
    { id: 1, no: "B001-000124", apptId: 1, concept: "Limpieza", amount: 90, method: "Yape", at: at("2026-10-05", 10) },
    { id: 2, no: "B001-000124", apptId: 1, concept: "Fluorización", amount: 30, method: "Yape", at: at("2026-10-05", 10) },
    { id: 3, no: "B001-000200", concept: "Consulta", amount: 50, method: "Efectivo", at: at("2026-09-20", 15) },
  ],
  notes: [{ id: 1, date: "2026-10-05", text: "Limpieza completa" }, { id: 2, date: "2026-08-01", text: "Primera consulta" }],
};

describe("portal del cliente", () => {
  it("agrupa los comprobantes por número", () => {
    expect(receiptsOf(data.payments).map((r) => [r[0].no, r.length])).toEqual([["B001-000200", 1], ["B001-000124", 2]]);
  });
  it("cada cita lleva sus comprobantes y las notas de su día; lo demás va suelto, en orden cronológico", () => {
    const t = buildTimeline(data, true);
    expect(t.map((g) => [g.kind, g.date])).toEqual([["cita", "2026-10-12"], ["cita", "2026-10-05"], ["comprobante", "2026-09-20"], ["nota", "2026-08-01"]]);
    const c = t.find((g) => g.appt?.id === 1)!;
    expect(c.pays).toHaveLength(2);
    expect(c.notes.map((n) => n.text)).toEqual(["Limpieza completa"]);
    expect(c.time).toBe("09:00");
    expect(buildTimeline(data, false).map((g) => g.date)).toEqual(["2026-08-01", "2026-09-20", "2026-10-05", "2026-10-12"]);
  });
});
