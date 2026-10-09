import { describe, expect, it } from "vitest";
import { apptByCode, apptCode, sessionGroup, sessionReceiptHtml } from "./receipts";
import type { Appt } from "./agenda";
import { type Payment, receiptNoFor } from "./payments";

const pay = (id: number, no: string, amount: number, method: Payment["method"], extra: Partial<Payment> = {}): Payment => ({ id, no, patient: "Ana", concept: "Limpieza", amount, method, date: "", at: `2026-10-12T15:0${id}:00Z`, apptId: 7, ...extra });

describe("comprobante por sesión", () => {
  it("el código de cita es estable y se puede buscar", () => {
    expect(apptCode(7)).toBe("CIT-00007");
    expect(apptCode(7)).toBe(apptCode(-7));
    const a = { id: 7 } as Appt;
    expect(apptByCode([a], " cit-00007 ")).toBe(a);
    expect(apptByCode([a], "CIT-00008")).toBeNull();
  });
  it("agrupa los cobros de la cita, sin anulados, con total y método", () => {
    const list = [pay(1, "B001-1", 100, "Yape"), pay(2, "B001-1", 50.5, "Yape"), pay(3, "B001-2", 30, "Efectivo"), pay(4, "B001-3", 99, "Yape", { voided: true }), pay(5, "B001-9", 10, "Yape", { apptId: 8 })];
    const g = sessionGroup(7, list, []);
    expect(g.code).toBe("CIT-00007");
    expect(g.lines.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(g.voided.map((p) => p.id)).toEqual([4]);
    expect(g.total).toBe(180.5);
    expect(g.receipts).toEqual(["B001-1", "B001-2"]);
    expect(Object.fromEntries(g.byMethod)).toEqual({ Yape: 150.5, Efectivo: 30 });
    const html = sessionReceiptHtml(g, { clinic: "Clínica <X>", when: (s) => s, day: (s) => s });
    expect(html).toContain("CIT-00007");
    expect(html).toContain("S/ 180.50");
    expect(html).toContain("Clínica &lt;X&gt;");
  });
});

describe("un comprobante por cita", () => {
  it("los cobros posteriores de una cita reutilizan su comprobante; otra cita usa el siguiente", () => {
    const list = [pay(1, "B001-000124", 10, "Yape", { apptId: 501 }), pay(2, "B001-000125", 5, "Yape", { apptId: 502 })];
    expect(receiptNoFor(list, 501)).toBe("B001-000124");
    expect(receiptNoFor(list, 503)).toBe("B001-000126");
    expect(receiptNoFor(list)).toBe("B001-000126");
  });
});
