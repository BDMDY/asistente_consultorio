import { describe, expect, it } from "vitest";
import { type Appt, checkReschedule, clash, firstFreeDoctor, freeStarts, generateSeries, hm, isSlotTaken, seedAgenda, slotOf } from "./agenda";

/** Las 09:00 son el tramo 36 (la grilla cubre las 24 h). */
const N = 36;
const mk = (o: Partial<Appt>): Appt => ({ id: 1, date: "2026-10-12", doc: 1, slot: N + 4, dur: 3, p: "X", s: "Control", st: "confirmada", ...o });

describe("grilla", () => {
  it("convierte tramos a hora y viceversa", () => {
    expect(hm(0)).toBe("00:00");
    expect(hm(N)).toBe("09:00");
    expect(hm(95)).toBe("23:45");
    expect(slotOf("10:30")).toBe(N + 6);
    expect(slotOf("08:45")).toBe(N - 1);
    expect(slotOf("24:00")).toBeNull();
    expect(slotOf("10:10")).toBeNull();
  });
});

describe("clash / freeStarts", () => {
  it("detecta solape en mismo día y doctor, ignora canceladas", () => {
    const l = [mk({})];
    expect(clash(l, { date: "2026-10-12", doc: 1, slot: N + 6, dur: 2 })).not.toBeNull();
    expect(clash(l, { date: "2026-10-12", doc: 2, slot: N + 6, dur: 2 })).toBeNull();
    expect(clash(l, { date: "2026-10-12", doc: 1, slot: N + 7, dur: 2 })).toBeNull();
    expect(clash([mk({ st: "cancelada" })], { date: "2026-10-12", doc: 1, slot: N + 4, dur: 3 })).toBeNull();
  });
  it("domingo no tiene horarios", () => {
    expect(freeStarts([], "2026-10-11", 1, 3)).toEqual([]);
  });
  it("respeta el cierre a las 17:00", () => {
    const f = freeStarts([], "2026-10-12", 1, 4);
    expect(Math.min(...f)).toBe(N);
    expect(Math.max(...f)).toBe(N + 28);
  });
});

describe("disponibilidad pública", () => {
  const l = [mk({ doc: 1, slot: N, dur: 3 }), mk({ id: 2, doc: 2, slot: N, dur: 3 })];
  it("sin preferencia: libre si algún doctor lo está", () => {
    expect(isSlotTaken(l, [1, 2, 3], "2026-10-12", null, N, 3)).toBe(false);
    expect(isSlotTaken(l, [1, 2], "2026-10-12", null, N, 3)).toBe(true);
    expect(firstFreeDoctor(l, [1, 2, 3], "2026-10-12", N, 3)).toBe(3);
  });
  it("fuera del horario de atención está ocupado", () => {
    expect(isSlotTaken([], [1], "2026-10-12", 1, 4, 3)).toBe(true); // 01:00
    expect(isSlotTaken([], [1], "2026-10-11", 1, N, 3)).toBe(true); // domingo
  });
});

describe("serie semanal", () => {
  const rule = { freq: "weekly" as const, days: [false, false, false, false, false, false, true], endMode: "count" as const, count: 5, until: "", onClash: "skip" as const };
  it("5 sábados consecutivos", () => {
    const s = generateSeries([], { date: "2026-10-10", slot: N + 2, doc: 1, dur: 3 }, rule);
    expect(s.map((x) => x.date)).toEqual(["2026-10-10", "2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07"]);
    expect(s.every((x) => x.status === "ok")).toBe(true);
  });
  it("omite el choque e informa", () => {
    const s = generateSeries([mk({ date: "2026-10-17", slot: N + 2, dur: 3, p: "Rosa" })], { date: "2026-10-10", slot: N + 2, doc: 1, dur: 3 }, rule);
    expect(s[1]).toMatchObject({ date: "2026-10-17", status: "skip", note: "Choca con Rosa" });
  });
  it("mueve al siguiente hueco cuando se pide", () => {
    const s = generateSeries([mk({ date: "2026-10-17", slot: N + 2, dur: 3 })], { date: "2026-10-10", slot: N + 2, doc: 1, dur: 3 }, { ...rule, onClash: "move" });
    expect(s[1]).toMatchObject({ status: "moved", slot: N + 5 });
  });
  it("mensual conserva el día del mes y por fecha termina en `until`", () => {
    const m = generateSeries([], { date: "2026-10-15", slot: N, doc: 1, dur: 2 }, { ...rule, freq: "monthly", count: 3 });
    expect(m.map((x) => x.date)).toEqual(["2026-10-15", "2026-11-15", "2026-12-15"]);
    const u = generateSeries([], { date: "2026-10-10", slot: N, doc: 1, dur: 2 }, { ...rule, endMode: "date", until: "2026-10-24" });
    expect(u).toHaveLength(3);
  });
});

describe("reprogramar", () => {
  const a = mk({ id: 9, date: "2026-10-12", slot: N + 4 });
  it("valida pasado, domingo, choque y mismo horario", () => {
    const l = [a, mk({ id: 10, date: "2026-10-13", slot: N + 4, p: "Otro" })];
    const t = "2026-10-12";
    expect(checkReschedule(l, a, { date: "2026-10-01", slot: N + 4, doc: 1 }, t).ok).toBe(false);
    expect(checkReschedule(l, a, { date: "2026-10-18", slot: N + 4, doc: 1 }, t)).toMatchObject({ error: "Los domingos no hay atención" });
    expect(checkReschedule(l, a, { date: "2026-10-13", slot: N + 5, doc: 1 }, t)).toMatchObject({ ok: false });
    expect(checkReschedule(l, a, { date: "2026-10-12", slot: N + 4, doc: 1 }, t)).toMatchObject({ error: "Es el mismo horario de la cita actual" });
    expect(checkReschedule(l, a, { date: "2026-10-14", slot: N + 4, doc: 1 }, t).ok).toBe(true);
  });
});

describe("semilla", () => {
  it("nunca cae en domingo", () => {
    for (const d of ["2026-10-10", "2026-10-11", "2026-10-12"]) {
      const s = seedAgenda(d);
      expect(new Date(s.appts[0].date + "T00:00:00Z").getUTCDay()).not.toBe(0);
    }
  });
});
