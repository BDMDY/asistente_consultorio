import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Appt } from "../agenda";
import type { Patient } from "../patients";
import { apptToRow, diffById, flatten, groupByPatient, patientToRow, rowToAppt, rowToPatient, rowToPayment, paymentToRow } from "./rows";
import { fetchAll, registerSpecs } from "./specs";
import { defineSpec, getCtx, queueSave, registerStore, setCtx } from "./sync";

describe("conversores de filas", () => {
  it("cita ↔ fila conserva los datos y el enlace", () => {
    const a: Appt = { id: 5, date: "2026-10-12", doc: 2, slot: 4, dur: 3, p: "Lucía Rojas", s: "Ortodoncia", st: "pendiente", web: true, dni: "45821367", phone: "987654321" };
    const row = apptToRow("c1", a);
    expect(row).toMatchObject({ clinic_id: "c1", doctor_id: 2, patient_name: "Lucía Rojas", service: "Ortodoncia", notes: null });
    expect(rowToAppt({ ...row, public_token: "t-1" })).toEqual({ ...a, token: "t-1" });
  });
  it("paciente y cobro", () => {
    const p: Patient = { id: 9, name: "Ana", dni: "", phone: "", alerts: ["Diabetes"] };
    expect(rowToPatient(patientToRow("c", p))).toEqual(p);
    const pay = { id: 1, no: "B001-000124", apptId: 5, patient: "Ana", concept: "Limpieza", amount: 90, method: "Yape" as const, date: "12 oct 09:00", at: "2026-10-12T14:00:00Z" };
    expect(rowToPayment({ ...paymentToRow("c", pay), amount: "90" })).toEqual(pay);
  });
  it("agrupa por paciente", () => {
    const g = groupByPatient([{ patient_id: 1, id: 2 }, { patient_id: 1, id: 3 }, { patient_id: 2, id: 4 }], (r) => r.id);
    expect(g).toEqual({ 1: [2, 3], 2: [4] });
    expect(flatten(g)).toHaveLength(3);
  });
});

describe("diffById", () => {
  it("detecta nuevos, cambiados y eliminados", () => {
    const d = diffById([{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 3, v: "c" }], [{ id: 1, v: "a" }, { id: 2, v: "B" }, { id: 4, v: "d" }], (x) => x.id);
    expect(d.upsert.map((x) => x.id)).toEqual([2, 4]);
    expect(d.remove).toEqual([3]);
  });
});

type Call = { table: string; op: string; arg?: unknown };
function fakeDb(opts: { fail?: string; pages?: number } = {}) {
  const calls: Call[] = [];
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    Object.assign(b, {
      upsert: (rows: unknown) => { calls.push({ table, op: "upsert", arg: rows }); return Promise.resolve({ error: opts.fail === "upsert" ? { message: "boom", code: "23P01" } : null }); },
      delete: () => { calls.push({ table, op: "delete" }); return { eq: () => ({ in: (_c: string, ids: unknown) => { calls.push({ table, op: "delete-ids", arg: ids }); return Promise.resolve({ error: null }); }, eq: chain }) }; },
      select: chain, eq: chain, order: chain,
      range: (from: number) => { const n = opts.pages ?? 0; const data = from === 0 ? Array.from({ length: n ? 1000 : 2 }, (_, i) => ({ id: i })) : Array.from({ length: 5 }, (_, i) => ({ id: 1000 + i })); return Promise.resolve({ data, error: null }); },
    });
    return b;
  };
  return { db: { from: builder } as unknown as SupabaseClient, calls };
}

describe("adaptadores", () => {
  it("pagina las lecturas de más de 1000 filas", async () => {
    const { db } = fakeDb({ pages: 1 });
    expect(await fetchAll(db, "patients", "c", ["id"])).toHaveLength(1005);
  });

  it("guarda solo la diferencia de la agenda", async () => {
    registerSpecs();
    const { db, calls } = fakeDb();
    setCtx({ db, clinicId: "c1" });
    const a = (id: number, st: Appt["st"] = "pendiente"): Appt => ({ id, date: "2026-10-12", doc: 1, slot: 0, dur: 2, p: "X", s: "Y", st });
    registerStore("agenda", { hydrate: () => {}, reset: () => {} });
    queueSave("agenda", { appts: [a(1), a(2)], nid: 0 }, { appts: [a(1, "confirmada"), a(3)], nid: 0 });
    await new Promise((r) => setTimeout(r, 20));
    const up = calls.find((c) => c.op === "upsert");
    expect((up?.arg as { id: number }[]).map((r) => r.id)).toEqual([1, 3]);
    expect(calls.find((c) => c.op === "delete-ids")?.arg).toEqual([2]);
    expect(getCtx()?.clinicId).toBe("c1");
  });

  it("ante un error vuelve a cargar el estado del servidor", async () => {
    const { db } = fakeDb({ fail: "upsert" });
    setCtx({ db, clinicId: "c1" });
    let loaded = 0;
    defineSpec<number>("t-fail", { tables: [], load: async () => ++loaded, save: async () => { throw new Error("x"); } });
    let value = 0;
    registerStore("t-fail", { hydrate: (v) => { value = v as number; }, reset: () => {} });
    await new Promise((r) => setTimeout(r, 20));
    const antes = loaded; // la carga inicial al registrarse
    queueSave("t-fail", 0, 99);
    await new Promise((r) => setTimeout(r, 30));
    expect(loaded).toBe(antes + 1);
    expect(value).toBe(loaded);
  });

  it("un store que se registra después de iniciar sesión se carga solo", async () => {
    const { db } = fakeDb();
    setCtx({ db, clinicId: "c1" });
    defineSpec<string>("t-late", { tables: [], load: async () => "cargado", save: async () => {} });
    let value = "";
    registerStore("t-late", { hydrate: (v) => { value = v as string; }, reset: () => {} });
    await new Promise((r) => setTimeout(r, 20));
    expect(value).toBe("cargado");
  });
});
