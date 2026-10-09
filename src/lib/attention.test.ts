import { describe, expect, it } from "vitest";
import type { Appt } from "./agenda";
import { checkResize, delayAlerts, delayMessage, endMin, inProgress, suggestedDelay } from "./attention";

const A = (id: number, slot: number, dur: number, extra: Partial<Appt> = {}): Appt => ({ id, date: "2026-10-12", doc: 1, slot, dur, p: "Paciente " + id, s: "Control", st: "confirmada", ...extra });
const T = "2026-10-12";

describe("redimensionar", () => {
  it("permite extender y reducir si hay espacio", () => {
    const list = [A(1, 0, 2), A(2, 6, 2)];
    expect(checkResize(list, list[0], 4)).toEqual({ ok: true });
    expect(checkResize(list, list[0], 1)).toEqual({ ok: true });
  });
  it("no pisa a la cita siguiente ni pasa de las 24:00 ni baja de 15 min", () => {
    const list = [A(1, 0, 2), A(2, 3, 2), A(3, 94, 2)];
    expect(checkResize(list, list[0], 4)).toMatchObject({ ok: false });
    expect(checkResize(list, list[2], 3)).toMatchObject({ ok: false }); // pasaría de las 24:00
    expect(checkResize(list, list[0], 0)).toMatchObject({ ok: false });
  });
});

describe("avisos de demora", () => {
  const list = [A(1, 0, 2, { t0: "2026-10-12T14:00:00Z" }), A(2, 2, 2), A(3, 10, 2)];
  it("no avisa antes de la hora de fin", () => {
    expect(delayAlerts(list, T, endMin(list[0]) - 1)).toEqual([]);
  });
  it("avisa cuando la cita en curso se pasa y hay un paciente cercano", () => {
    const [al] = delayAlerts(list, T, endMin(list[0]) + 10);
    expect(al.current.id).toBe(1);
    expect(al.next.id).toBe(2);
    expect(al.overrun).toBe(10);
    expect(al.wait).toBe(10);
    expect(suggestedDelay(al)).toBe(20);
  });
  it("no avisa si el fin ya fue marcado, si no hay iniciada o si el siguiente está lejos", () => {
    expect(delayAlerts([{ ...list[0], t1: "x" }, list[1]], T, 700)).toEqual([]);
    expect(delayAlerts([A(1, 0, 2), A(2, 2, 2)], T, 700)).toEqual([]);
    expect(delayAlerts([list[0], A(2, 12, 2)], T, endMin(list[0]) + 5)).toEqual([]);
  });
  it("también cuenta al paciente en sala sin inicio marcado, y no avisa sin hora válida", () => {
    expect(inProgress(A(1, 0, 2, { st: "en-sala" }))).toBe(true);
    expect(delayAlerts(list, T, -1)).toEqual([]);
  });
  it("redacta el mensaje de demora", () => {
    const m = delayMessage({ name: "Mario Soto", clinic: "Clínica Sonríe", minutes: 15, when: "10:30" });
    expect(m).toContain("Hola Mario");
    expect(m).toContain("15 minutos");
  });
});
