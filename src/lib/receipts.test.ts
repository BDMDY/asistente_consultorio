import { describe, expect, it } from "vitest";
import { apptByCode, apptCode, sessionGroup, sessionReceiptHtml } from "./receipts";
import type { Appt } from "./agenda";
import { type Payment, nextReceiptNumber, receiptNoFor } from "./payments";
import { addToPool, clearPool } from "./receipt-pool";

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

describe("correlativo de comprobantes", () => {
  it("no se repite aunque se borren cobros y respeta los números reservados en el servidor", () => {
    const list = [pay(1, "B001-000124", 10, "Yape", { apptId: 1 }), pay(2, "B001-000127", 5, "Yape", { apptId: 2 })];
    expect(nextReceiptNumber(list)).toBe(128);
    expect(receiptNoFor(list)).toBe("B001-000128");
    expect(receiptNoFor([])).toBe("B001-000124");
    addToPool(200, 2);
    expect(receiptNoFor(list)).toBe("B001-000200");
    expect(receiptNoFor(list)).toBe("B001-000201");
    expect(receiptNoFor(list)).toBe("B001-000128");
    clearPool();
  });
});

describe("imágenes del sitio", () => {
  it("cuenta solo las imágenes incrustadas grandes", async () => {
    const { countInlineImages, isDataImage } = await import("./backend/storage");
    const big = "data:image/jpeg;base64," + "A".repeat(9000);
    const small = "data:image/png;base64,AAAA";
    expect(isDataImage(big)).toBe(true);
    expect(countInlineImages({ img: { hero: big, favicon: small, logoL: "https://x/y.png" }, docs: [{ photo: big }, { photo: "" }], hero: [{ src: big }] })).toBe(3);
    expect(countInlineImages({})).toBe(0);
  });
});
