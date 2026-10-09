import { describe, expect, it } from "vitest";
import { applyBulk, parsePriceCell, parseServiceSheet } from "./bulk-services";
import { nextServiceCode, withCodes, type Service } from "./media";

const sv = (id: number, name: string, extra: Partial<Service> = {}): Service => ({ id, name, desc: "", price: "100", ...extra });

describe("códigos de servicio", () => {
  it("asigna TRT-001… a los que no tienen y no repite", () => {
    const l = withCodes([sv(1, "A"), sv(2, "B", { code: "TRT-005" }), sv(3, "C")]);
    expect(l.map((s) => s.code)).toEqual(["TRT-006", "TRT-005", "TRT-007"]);
    expect(nextServiceCode(l)).toBe("TRT-008");
    expect(nextServiceCode([])).toBe("TRT-001");
  });
});

describe("carga masiva de tratamientos", () => {
  it("lee precios en distintos formatos", () => {
    expect(parsePriceCell(50)).toBe(50);
    expect(parsePriceCell("S/ 350.00")).toBe(350);
    expect(parsePriceCell("1,800")).toBe(1800);
    expect(parsePriceCell("S/. 1200,50")).toBe(1200.5);
    expect(parsePriceCell("Criterio de Odontologo")).toBeNull();
    expect(parsePriceCell("")).toBeNull();
  });
  const sheet = [
    ["PRECIOS DE TRATAMIENTOS"], [],
    ["Tratamiento", "Precio actualizado\n(manuscrito)", "Sesiones"],
    ["Consulta", 50, 1],
    ["Clareamiento casero", "S/ 350.00", 1],
    ["Tratamiento Ortodoncia menor de 1 año", 4000, 12],
    ["Tratamiento Ortodoncia mayor de 1 año", "Criterio de Odontologo", "Criterio de Odontologo"],
    ["consulta", 60, 1],
    [null, 10, 1],
  ];
  it("encuentra los encabezados bajo un título, avisa y deja el último repetido", () => {
    const r = parseServiceSheet(sheet, []);
    expect(r.rows.map((x) => x.name)).toEqual(["consulta", "Clareamiento casero", "Tratamiento Ortodoncia menor de 1 año", "Tratamiento Ortodoncia mayor de 1 año"]);
    expect(r.rows[0].price).toBe(60);
    expect(r.rows[2]).toMatchObject({ price: 4000, sessions: 12 });
    expect(r.rows[3].price).toBeNull();
    expect(r.rows[3].notes.length).toBe(2);
    expect(r.errors.some((e) => /repetido/.test(e))).toBe(true);
  });
  it("actualiza por nombre o código y crea los nuevos con código correlativo", () => {
    const cur = [sv(1, "Consulta", { code: "TRT-001", price: "40" })];
    const r = parseServiceSheet(sheet, cur);
    expect(r.rows[0]).toMatchObject({ action: "actualizar", targetId: 1 });
    const out = applyBulk(cur, r.rows);
    expect(out).toMatchObject({ created: 3, updated: 1 });
    expect(out.services.find((s) => s.id === 1)).toMatchObject({ price: "60", sessions: 1, code: "TRT-001" });
    expect(out.services.map((s) => s.code)).toEqual(["TRT-001", "TRT-002", "TRT-003", "TRT-004"]);
    expect(out.services[3]).toMatchObject({ price: "", sessions: 1, on: true });
  });
  it("sin columna de tratamiento avisa", () => {
    expect(parseServiceSheet([["a", "b"], [1, 2]], []).errors[0]).toMatch(/Tratamiento/);
  });
});

describe("tratamientos con pago inicial", () => {
  it("lee la columna de pago inicial y la ignora si no es menor al precio", () => {
    const r = parseServiceSheet([["Tratamiento", "Precio", "Pago inicial", "Sesiones"], ["Ortodoncia", 3440, 1400, 12], ["Raro", 100, 150, 2]], []);
    expect(r.rows[0]).toMatchObject({ price: 3440, initial: 1400, sessions: 12 });
    expect(r.rows[1].initial).toBeUndefined();
    expect(r.rows[1].notes[0]).toMatch(/Pago inicial/);
    expect(applyBulk([], r.rows).services[0]).toMatchObject({ initial: 1400 });
  });
});

describe("visibilidad en el sitio", () => {
  it("la carga masiva puede dejar los nuevos como solo uso interno y webServices los oculta", async () => {
    const { webServices, DEFAULT_MEDIA } = await import("./media");
    const rows = parseServiceSheet([["Tratamiento", "Precio"], ["Espigo", 150]], []).rows;
    const out = applyBulk([], rows, { web: false }).services;
    expect(out[0].web).toBe(false);
    expect(applyBulk([], rows).services[0].web).toBeUndefined();
    const m = { ...DEFAULT_MEDIA, services: [...out, { id: 9, name: "Consulta", desc: "", price: "50" }, { id: 10, name: "Apagado", desc: "", price: "1", on: false }] };
    expect(webServices(m).map((s) => s.name)).toEqual(["Consulta"]);
  });
});

describe("hero", () => {
  it("valida enlaces de video y usa la foto hero cuando no hay carrusel", async () => {
    const { isVideoUrl, heroSlides, DEFAULT_MEDIA } = await import("./media");
    expect(isVideoUrl("https://cdn.ejemplo.com/hero.mp4")).toBe(true);
    expect(isVideoUrl("https://x.com/a.webm?v=2")).toBe(true);
    expect(isVideoUrl("http://x.com/a.mp4")).toBe(false);
    expect(isVideoUrl("https://youtube.com/watch?v=1")).toBe(false);
    expect(heroSlides(DEFAULT_MEDIA)).toEqual([]);
    expect(heroSlides({ ...DEFAULT_MEDIA, img: { hero: "data:x" } })).toEqual([{ id: 0, kind: "image", src: "data:x" }]);
    const a = { id: 1, kind: "anim" as const, anim: "ondas" as const };
    expect(heroSlides({ ...DEFAULT_MEDIA, img: { hero: "data:x" }, hero: [a] })).toEqual([a]);
  });
});

describe("subida de video", () => {
  it("valida formato y peso antes de subir", async () => {
    const { checkVideoFile } = await import("./backend/storage");
    expect(checkVideoFile({ name: "hero.mp4", type: "video/mp4", size: 5e6 })).toBeNull();
    expect(checkVideoFile({ name: "hero.webm", type: "", size: 1e6 })).toBeNull();
    expect(checkVideoFile({ name: "hero.mov", type: "video/quicktime", size: 1e6 })).toMatch(/MP4 o WebM/);
    expect(checkVideoFile({ name: "hero.mp4", type: "video/mp4", size: 12 * 1048576 })).toMatch(/12\.0 MB/);
  });
});

describe("enlaces de redes sociales", () => {
  it("arma el enlace desde @usuario, /pagina, dominio o URL y rechaza lo que no es http(s)", async () => {
    const { socialUrl } = await import("./brand");
    expect(socialUrl("instagram", "@clinicasonrie")).toBe("https://instagram.com/clinicasonrie");
    expect(socialUrl("facebook", "/clinicasonrie")).toBe("https://facebook.com/clinicasonrie");
    expect(socialUrl("facebook", "clinica.sonrie")).toBe("https://facebook.com/clinica.sonrie");
    expect(socialUrl("instagram", "instagram.com/dental")).toBe("https://instagram.com/dental");
    expect(socialUrl("facebook", "https://www.facebook.com/dental.mavila")).toBe("https://www.facebook.com/dental.mavila");
    expect(socialUrl("instagram", "  ")).toBeNull();
    expect(socialUrl("instagram", "javascript:alert(1)")).toBeNull();
  });
});
