import { describe, expect, it } from "vitest";

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
    expect(socialUrl("instagram", "@clinicademo")).toBe("https://instagram.com/clinicademo");
    expect(socialUrl("facebook", "/clinicademo")).toBe("https://facebook.com/clinicademo");
    expect(socialUrl("facebook", "clinica.demo")).toBe("https://facebook.com/clinica.demo");
    expect(socialUrl("instagram", "instagram.com/dental")).toBe("https://instagram.com/dental");
    expect(socialUrl("facebook", "https://www.facebook.com/dental.mavila")).toBe("https://www.facebook.com/dental.mavila");
    expect(socialUrl("instagram", "  ")).toBeNull();
    expect(socialUrl("instagram", "javascript:alert(1)")).toBeNull();
  });
});

describe("banner del sitio", () => {
  it("solo acepta enlaces https o rutas internas", async () => {
    const { bannerHref } = await import("./media");
    expect(bannerHref("https://promo.com/x")).toBe("https://promo.com/x");
    expect(bannerHref("/reserva")).toBe("/reserva");
    expect(bannerHref("//evil.com")).toBe("");
    expect(bannerHref("javascript:alert(1)")).toBe("");
    expect(bannerHref("")).toBe("");
  });
});
