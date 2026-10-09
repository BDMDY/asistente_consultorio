import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE, closedReason, dayWindow, nextOpen, scheduleOf, scheduleSummary } from "./schedule";

const mk = (over: Partial<ReturnType<typeof scheduleOf>> = {}) => scheduleOf({ ...DEFAULT_SCHEDULE, ...over });

describe("horario de atención", () => {
  it("por defecto atiende lunes a sábado, 09:00–17:00", () => {
    expect(dayWindow("2026-10-12", DEFAULT_SCHEDULE)).toEqual({ from: 0, to: 32 }); // lunes
    expect(dayWindow("2026-10-11", DEFAULT_SCHEDULE)).toBeNull(); // domingo
    expect(closedReason("2026-10-11", DEFAULT_SCHEDULE)).toBe("Los domingos no hay atención");
  });
  it("un día de descanso configurado no tiene ventana", () => {
    const s = mk({ days: DEFAULT_SCHEDULE.days.map((d, i) => (i === 3 ? { ...d, open: false } : d)) }); // miércoles cerrado
    expect(dayWindow("2026-10-14", s)).toBeNull();
    expect(closedReason("2026-10-14", s)).toBe("Los miércoles no hay atención");
    expect(nextOpen("2026-10-14", s)).toBe("2026-10-15");
  });
  it("horas parciales: sábado hasta las 13:00", () => {
    const s = mk({ days: DEFAULT_SCHEDULE.days.map((d, i) => (i === 6 ? { ...d, to: 16 } : d)) });
    expect(dayWindow("2026-10-17", s)).toEqual({ from: 0, to: 16 });
    expect(scheduleSummary(s)).toBe("Lun–Vie 9:00–17:00 · Sáb 9:00–13:00");
  });
  it("un cierre especial (feriado) cierra ese día", () => {
    const s = mk({ closures: [{ id: "c1", date: "2026-12-25", label: "Navidad" }] });
    expect(dayWindow("2026-12-25", s)).toBeNull();
    expect(closedReason("2026-12-25", s)).toBe("Cierre especial: Navidad");
    expect(nextOpen("2026-12-25", s)).toBe("2026-12-26");
  });
  it("sanea datos incompletos o inválidos", () => {
    const s = scheduleOf({ days: [{ open: true, from: 99, to: -5 }] as never, closures: [{ id: "x", date: "mal", label: "" }] });
    expect(s.days[0].from).toBeLessThan(s.days[0].to);
    expect(s.closures).toEqual([]);
    expect(s.days).toHaveLength(7);
  });
});
