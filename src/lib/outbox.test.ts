import { describe, expect, it } from "vitest";

describe("WhatsApp", () => {
  it("normaliza celulares peruanos y descarta números inválidos", async () => {
    const { waNumber, waUrl } = await import("./outbox");
    expect(waNumber("987 654 321")).toBe("51987654321");
    expect(waNumber("+51 987654321")).toBe("51987654321");
    expect(waNumber("12345")).toBe("");
    expect(waNumber(undefined)).toBe("");
    expect(waUrl("987654321", "Hola & más")).toBe("https://wa.me/51987654321?text=Hola%20%26%20m%C3%A1s");
    expect(waUrl("", "x")).toBe("");
  });
});
