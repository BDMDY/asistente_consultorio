"use client";
import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useDoctors } from "@/lib/doctors";
import { DEFAULT_MEDIA, HERO_ANIMS, HERO_SECS_MAX, HERO_SECS_MIN, heroSlideSecs, type HeroSlide, type SiteBanner, bannerHref, MAX_HERO_SLIDES, isVideoUrl, type DoctorProfile, type Media, type MediaImages, mediaStore, resolveMedia, useMedia } from "@/lib/media";
import { loadImage } from "@/lib/image";
import { checkVideoFile, countInlineImages, hostAllImages, hostImage, isHostedVideo, removeHostedVideo, uploadHeroVideo } from "@/lib/backend/storage";
import { isRemote } from "@/lib/backend/config";
import { toast } from "@/lib/toast";

const inp: React.CSSProperties = { borderRadius: 8, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--surface)", color: "inherit", minWidth: 0, boxSizing: "border-box" };
const SIZE_HINT: Record<string, string> = {
  logoL: "800 × 250 px · PNG transparente · para fondo claro",
  logoD: "800 × 250 px · PNG transparente · para fondo oscuro",
  favicon: "128 × 128 px · PNG cuadrado, símbolo simple",
  hero: "1000 × 750 px · horizontal 4:3",
  login: "1000 × 1000 px · cuadrada · solo en computadora",
};
const nextId = (l: { id: number }[]) => Math.max(0, ...l.map((x) => x.id)) + 1;

type ListKey = "services" | "stats" | "quotes" | "faq" | "docs" | "facs" | "cases";
const commit = (fn: (m: Media) => Partial<Media>) => mediaStore.update((p) => ({ ...p, ...fn(resolveMedia(p)) }));
function setItem<K extends ListKey>(key: K, id: number, patch: Partial<Media[K][number]>) {
  commit((m) => ({ [key]: (m[key] as { id: number }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
function delItem(key: ListKey, id: number) {
  commit((m) => ({ [key]: (m[key] as { id: number }[]).filter((x) => x.id !== id) }));
}

/** Botón-imagen: abre el selector y guarda la foto reducida. */
function Pick({ src, label, w, h, round, icon, fit = "cover", logoMode, max, onPick, bg = "var(--brand-50)" }: { src?: string; label: string; w?: number | string; h: number; round?: boolean; icon: IconName; fit?: "cover" | "contain"; logoMode?: boolean; max?: number; onPick: (url: string) => void; bg?: string }) {
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = await loadImage(f, { logo: logoMode, max });
    if (!r.ok) return toast(r.error);
    const url = await hostImage(r.dataUrl, "foto");
    if (src && isHostedVideo(src)) void removeHostedVideo(src);
    onPick(url);
    toast("Imagen cargada");
  }
  return (
    <label aria-label={label} title={label} style={{ cursor: "pointer", width: w ?? "100%", height: h, flexShrink: 0, borderRadius: round ? "50%" : 10, border: src ? "1.5px solid var(--brand-200)" : "1.5px dashed var(--brand-300)", background: bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-text)", backgroundImage: src ? `url("${src}")` : undefined, backgroundSize: fit, backgroundRepeat: "no-repeat", backgroundPosition: "center" }}>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} style={{ display: "none" }} />
      {!src && <Icon name={icon} />}
    </label>
  );
}

const trash = (onClick: () => void, label: string) => (
  <button type="button" aria-label={label} onClick={onClick} style={{ cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error-fg)", background: "transparent", border: 0, flexShrink: 0 }}><Icon name="trash-2" /></button>
);
const addBtn = (t: string, onClick: () => void) => (
  <button type="button" onClick={onClick} style={{ cursor: "pointer", padding: "7px 12px", borderRadius: 10, background: "var(--brand-50)", color: "var(--brand-800)", fontWeight: 700, fontSize: 12, border: 0, fontFamily: "inherit" }}>{t}</button>
);
const empty = (t: string) => <div style={{ padding: 14, borderRadius: 12, border: "1.5px dashed var(--brand-200)", textAlign: "center", fontSize: 13, color: "var(--ink-500)" }}>{t}</div>;
const section = (title: string, count: number | null, add: React.ReactNode, children: React.ReactNode) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <b style={{ fontSize: 15 }}>{title}{count !== null && <span style={{ color: "var(--ink-500)", fontWeight: 600 }}> · {count}</span>}</b>{add}
    </div>
    {children}
  </div>
);
const hint = (t: string) => <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}><b>Medidas:</b> {t}</div>;
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" };

/** Editor de logos, fotos y listas del sitio público. Las secciones sin elementos se ocultan en el sitio. */
export default function MediaEditor({ showIdentity = true }: { showIdentity?: boolean }) {
  const m = useMedia();
  const doctors = useDoctors();
  const setImg = (k: keyof MediaImages, url: string) => commit((x) => ({ img: { ...x.img, [k]: url } }));
  const delImg = (k: keyof MediaImages) => commit((x) => { const n = { ...x.img }; delete n[k]; return { img: n }; });
  const singles: [keyof MediaImages, string, "contain" | "cover", string, boolean][] = [
    ["logoL", "Logo claro", "contain", "var(--brand-50)", true], ["logoD", "Logo oscuro", "contain", "var(--brand-950)", true], ["favicon", "Favicon", "contain", "var(--brand-50)", true], ["hero", "Foto hero", "cover", "var(--brand-50)", false], ["login", "Imagen del acceso", "cover", "var(--brand-50)", false],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {showIdentity && section("Identidad", null, null, (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
          {singles.map(([k, label, fit, bg, logo]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-500)", lineHeight: 1.4, minHeight: 48 }}>{SIZE_HINT[k]}</div>
              <Pick src={m.img[k]} label={label} h={72} icon="upload" fit={fit} bg={bg} logoMode={logo} max={k === "favicon" ? 128 : undefined} onPick={(u) => setImg(k, u)} />
              <button type="button" onClick={() => delImg(k)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--error-fg)", visibility: m.img[k] ? "visible" : "hidden", background: "transparent", border: 0, textAlign: "left", padding: 0 }}>Quitar</button>
            </div>
          ))}
        </div>
      ))}

      {section("Hero · carrusel", m.hero.length, null, <HeroSlides slides={m.hero} />)}

      {section("Servicios", m.services.length, addBtn("+ Agregar servicio", () => commit((x) => ({ services: [...x.services, { id: nextId(x.services), name: "", desc: "", price: "", dur: 30, on: true }] }))),
        <>
          {m.services.length === 0 && empty("Sin servicios: la sección se oculta en el sitio.")}
          {m.services.map((d) => (
            <div key={d.id} style={row}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <input aria-label="Servicio" value={d.name} onChange={(e) => setItem("services", d.id, { name: e.target.value })} placeholder="Servicio" style={{ ...inp, height: 30, fontWeight: 600 }} />
                <input aria-label="Descripción breve" value={d.desc} onChange={(e) => setItem("services", d.id, { desc: e.target.value })} placeholder="Descripción breve" style={{ ...inp, height: 28, fontSize: 12 }} />
              </div>
              <input aria-label="Desde S/ (opcional)" value={d.price} onChange={(e) => setItem("services", d.id, { price: e.target.value })} placeholder="Desde S/" style={{ ...inp, width: 82, height: 34, fontSize: 12 }} />
              <input aria-label="Sesiones del tratamiento" title="Sesiones del tratamiento" value={d.sessions ?? 1} inputMode="numeric" onChange={(e) => setItem("services", d.id, { sessions: Math.max(1, Math.round(Number(e.target.value)) || 1) })} style={{ ...inp, width: 44, height: 34, fontSize: 12 }} />
              {trash(() => delItem("services", d.id), "Quitar servicio")}
            </div>
          ))}
        </>)}

      {isRemote && <MoveImages />}

      {section("Prueba social del hero", null, null, <>
        <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>Línea bajo el botón «Reservar cita»: <b>★ calificación · pacientes · horario</b>. Solo se muestra lo que escribas aquí (el horario siempre). Usa datos reales; déjalo vacío si prefieres no mostrarlo.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input aria-label="Calificación (ej. 4.9)" value={m.proof.rating ?? ""} onChange={(ev) => commit((x) => ({ proof: { ...x.proof, rating: ev.target.value } }))} placeholder="Calificación (ej. 4.9)" style={{ ...inp, height: 34, padding: "0 10px" }} />
          <input aria-label="Pacientes atendidos (ej. 1,200+)" value={m.proof.patients ?? ""} onChange={(ev) => commit((x) => ({ proof: { ...x.proof, patients: ev.target.value } }))} placeholder="Pacientes (ej. 1,200+)" style={{ ...inp, height: 34, padding: "0 10px" }} />
        </div>
      </>)}

      {section("Banner del sitio", null, null, <BannerEditor banner={m.banner} />)}

      {section("Cifras del sitio", null, null, <>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={!!m.banner.showStats} onChange={(e) => commit((x) => ({ banner: { ...x.banner, showStats: e.target.checked } }))} />
          Mostrar la franja de cifras en el sitio (por defecto va oculta; son cifras de ejemplo, cámbialas por las reales)
        </label>
        {m.stats.map((d) => (
        <div key={d.id} style={row}>
          <input value={d.n} onChange={(e) => setItem("stats", d.id, { n: e.target.value })} aria-label="Cifra" style={{ ...inp, width: 90, height: 34, fontSize: 14, fontWeight: 700 }} />
          <input value={d.l} onChange={(e) => setItem("stats", d.id, { l: e.target.value })} aria-label="Descripción" style={{ ...inp, flex: 1, height: 34, padding: "0 10px" }} />
        </div>
        ))}
      </>)}

      {section("Testimonios", m.quotes.length, addBtn("+ Agregar testimonio", () => commit((x) => ({ quotes: [...x.quotes, { id: nextId(x.quotes), t: "", a: "" }] }))),
        <>
          {m.quotes.length === 0 && empty("Sin testimonios: la sección se oculta en el sitio.")}
          {m.quotes.map((d) => (
            <div key={d.id} style={{ ...row, alignItems: "flex-start" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <input value={d.t} onChange={(e) => setItem("quotes", d.id, { t: e.target.value })} placeholder="Testimonio" aria-label="Testimonio" style={{ ...inp, height: 34, padding: "0 10px" }} />
                <input value={d.a} onChange={(e) => setItem("quotes", d.id, { a: e.target.value })} placeholder="Nombre · tratamiento" aria-label="Autor" style={{ ...inp, height: 30, fontSize: 12, padding: "0 10px" }} />
              </div>
              {trash(() => delItem("quotes", d.id), "Quitar testimonio")}
            </div>
          ))}
        </>)}

      {section("Preguntas frecuentes", m.faq.length, addBtn("+ Agregar pregunta", () => commit((x) => ({ faq: [...x.faq, { id: nextId(x.faq), q: "", a: "" }] }))),
        <>
          {m.faq.length === 0 && empty("Sin preguntas: la sección se oculta en el sitio. Escribe solo lo que la clínica realmente ofrece (pagos, emergencias, duración…).")}
          {m.faq.map((d) => (
            <div key={d.id} style={{ ...row, alignItems: "flex-start" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <input value={d.q} onChange={(e) => setItem("faq", d.id, { q: e.target.value })} placeholder="Pregunta" aria-label="Pregunta" style={{ ...inp, height: 34, padding: "0 10px", fontWeight: 600 }} />
                <textarea value={d.a} onChange={(e) => setItem("faq", d.id, { a: e.target.value })} placeholder="Respuesta" aria-label="Respuesta" rows={2} style={{ ...inp, padding: "6px 10px", resize: "vertical", fontFamily: "inherit" }} />
              </div>
              {trash(() => delItem("faq", d.id), "Quitar pregunta")}
            </div>
          ))}
        </>)}

      {section("Equipo", doctors.length, null,
        <>
          {hint("Foto de cada doctor: 600 × 520 px, con el rostro centrado. Se muestra en un recuadro de unos 260 × 220 px.")}
          <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
            El equipo sale de los usuarios con perfil <b>Doctor</b> (nombre y colegiatura incluidos) y es el mismo de la agenda y la reserva. Para agregar o quitar doctores ve a <Link href="/intranet/modulos/configuracion" style={{ color: "var(--brand-text)", fontWeight: 700 }}>Configuración → Usuarios</Link>. Aquí completas cómo se presentan en el sitio.
          </div>
          {doctors.length === 0 && empty("Aún no hay doctores registrados: la sección Equipo se oculta en el sitio y no se pueden tomar reservas.")}
          {doctors.map((d) => {
            const p = m.docs.find((x) => x.id === d.id);
            const upsert = (patch: Partial<DoctorProfile>) => commit((x) => ({ docs: x.docs.some((y) => y.id === d.id) ? x.docs.map((y) => (y.id === d.id ? { ...y, ...patch } : y)) : [...x.docs, { id: d.id, spec: "", photo: "", ...patch }] }));
            return (
              <div key={d.id} style={{ ...row, gap: 10 }}>
                <Pick src={d.photo} label={`Foto de ${d.name}`} w={56} h={56} icon="user" onPick={(u) => upsert({ photo: u })} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <b style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</b>
                  </div>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input aria-label={`Especialidad de ${d.name}`} value={p?.spec ?? ""} onChange={(e) => upsert({ spec: e.target.value })} placeholder="Especialidad" style={{ ...inp, flex: 1, height: 28, fontSize: 12 }} />
                    <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)", whiteSpace: "nowrap" }}>COP {d.cop}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </>)}

      {section("Instalaciones", m.facs.length, addBtn("+ Agregar foto", () => commit((x) => ({ facs: [...x.facs, { id: nextId(x.facs), cap: "", photo: "" }] }))),
        <>
          {hint("Fotos horizontales 3:2, de 900 × 600 px. Cada una se ve de unos 300 × 200 px.")}
          {m.facs.length === 0 && empty("Sin fotos: la sección se oculta en el sitio.")}
          {m.facs.map((d) => (
            <div key={d.id} style={{ ...row, gap: 10 }}>
              <Pick src={d.photo} label={`Foto de ${d.cap || "instalaciones"}`} w={84} h={56} icon="image" onPick={(u) => setItem("facs", d.id, { photo: u })} />
              <input aria-label="Leyenda (ej. Recepción)" value={d.cap} onChange={(e) => setItem("facs", d.id, { cap: e.target.value })} placeholder="Leyenda (ej. Recepción)" style={{ ...inp, flex: 1, height: 34, padding: "0 10px" }} />
              {trash(() => delItem("facs", d.id), "Quitar foto")}
            </div>
          ))}
        </>)}

      {section("Casos antes / después", m.cases.length, addBtn("+ Agregar caso", () => commit((x) => ({ cases: [...x.cases, { id: nextId(x.cases), label: "", before: "", after: "" }] }))),
        <>
          {hint("Dos fotos de 600 × 600 px (cuadradas) con el mismo encuadre y distancia, para que se puedan comparar.")}
          {m.cases.length === 0 && empty("Sin casos: la galería se oculta en el sitio.")}
          {m.cases.map((d) => (
            <div key={d.id} style={row}>
              <div style={{ position: "relative" }}><Pick src={d.before} label="Foto antes" w={64} h={56} icon="image" bg="var(--muted)" onPick={(u) => setItem("cases", d.id, { before: u })} />{!d.before && <small style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "var(--ink-500)" }}>ANTES</small>}</div>
              <div style={{ position: "relative" }}><Pick src={d.after} label="Foto después" w={64} h={56} icon="image" onPick={(u) => setItem("cases", d.id, { after: u })} />{!d.after && <small style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "var(--brand-text)" }}>DESPUÉS</small>}</div>
              <input aria-label="Tratamiento (ej. Ortodoncia 14 meses)" value={d.label} onChange={(e) => setItem("cases", d.id, { label: e.target.value })} placeholder="Tratamiento (ej. Ortodoncia 14 meses)" style={{ ...inp, flex: 1, height: 34, padding: "0 10px" }} />
              {trash(() => delItem("cases", d.id), "Quitar caso")}
            </div>
          ))}
        </>)}
    </div>
  );
}

export function resetMedia() {
  mediaStore.set({ ...JSON.parse(JSON.stringify(DEFAULT_MEDIA)) });
  toast("Valores restablecidos");
}

/** Carrusel del hero: fotos, videos en bucle (enlace) y animaciones incluidas; con orden. */
function HeroSlides({ slides }: { slides: HeroSlide[] }) {
  const set = (hero: HeroSlide[]) => commit(() => ({ hero }));
  const full = slides.length >= MAX_HERO_SLIDES;
  const [busy, setBusy] = useState(false);
  async function onVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const bad = checkVideoFile(f);
    if (bad) return toast(bad);
    setBusy(true);
    const r = await uploadHeroVideo(f);
    setBusy(false);
    if (!r.ok) return toast(r.error);
    add({ kind: "video", src: r.url });
    toast(f.size > 3 * 1048576 ? `Video subido · pesa ${(f.size / 1048576).toFixed(1)} MB: lo ideal es menos de 2 MB para que la portada cargue rápido` : "Video subido · ya está en el carrusel");
  }
  const drop = (sl: HeroSlide) => { if (sl.kind === "video" && sl.src && isHostedVideo(sl.src)) void removeHostedVideo(sl.src); set(slides.filter((x) => x.id !== sl.id)); };
  const add = (sl: Omit<HeroSlide, "id">) => set([...slides, { ...sl, id: nextId(slides) }]);
  const patch = (id: number, p: Partial<HeroSlide>) => set(slides.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (k: number, d: number) => { const n = [...slides]; const j = k + d; if (j < 0 || j >= n.length) return; [n[k], n[j]] = [n[j], n[k]]; set(n); };
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = await loadImage(f, {});
    if (!r.ok) return toast(r.error);
    add({ kind: "image", src: await hostImage(r.dataUrl, "hero") });
  }
  const small: React.CSSProperties = { cursor: "pointer", width: 28, height: 28, borderRadius: 8, border: 0, background: "var(--brand-50)", color: "var(--brand-800)", fontWeight: 800, fontFamily: "inherit" };
  const addStyle = (off: boolean): React.CSSProperties => ({ cursor: off ? "not-allowed" : "pointer", padding: "7px 12px", borderRadius: 10, background: "var(--brand-50)", color: "var(--brand-800)", fontWeight: 700, fontSize: 12, border: 0, fontFamily: "inherit", opacity: off ? 0.5 : 1 });
  return (
    <>
      <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
        Con una sola diapositiva se muestra fija; con varias pasan solas según los «Segundos» de cada una (vacío = 6,5 s; 14 s en video; de 2 a 60) y se pausan al pasar el mouse. Los videos van en bucle y sin sonido: usa «+ Video» para subir un archivo <b>MP4</b> o <b>WebM</b> (de 5 a 15 s; ideal menos de 2 MB, máximo 10 MB) o «+ Video por enlace» si ya lo tienes alojado. Sin diapositivas se usa la «Foto hero» de Identidad.
      </div>
      {hint("Fotos: 1000 × 750 px (horizontal 4:3). Videos: 1280 × 960 px (4:3), MP4 o WebM, idealmente de menos de 2 MB. Deja lo importante al centro: los bordes pueden recortarse.")}
      {slides.length === 0 && empty("Sin diapositivas: se usa la foto hero o un fondo de color.")}
      {slides.map((sl, k) => (
        <div key={sl.id} style={row}>
          <div style={{ width: 56, height: 40, borderRadius: 8, flexShrink: 0, overflow: "hidden", background: "linear-gradient(135deg,var(--brand-700),var(--brand-300))", backgroundImage: sl.kind === "image" ? `url("${sl.src}")` : undefined, backgroundSize: "cover", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            {sl.kind === "video" && <Icon name="play" size={16} />}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <b style={{ fontSize: 12 }}>{k + 1}. {sl.kind === "image" ? "Foto" : sl.kind === "video" ? "Video en bucle" : "Animación"}</b>
            {sl.kind === "video" && sl.src && isHostedVideo(sl.src) && <span style={{ fontSize: 12, color: "var(--ink-500)" }}>Video subido a tu sitio</span>}
            {sl.kind === "video" && !(sl.src && isHostedVideo(sl.src)) && <input aria-label={`Enlace del video ${k + 1}`} defaultValue={sl.src ?? ""} onBlur={(e) => { const v = e.target.value.trim(); if (v && !isVideoUrl(v)) toast("El enlace debe ser https y terminar en .mp4, .webm u .ogg"); else patch(sl.id, { src: v }); }} placeholder="https://…/video.mp4" style={{ ...inp, height: 30, padding: "0 8px" }} />}
            {sl.kind === "anim" && (
              <select aria-label={`Animación ${k + 1}`} value={sl.anim ?? "ondas"} onChange={(e) => patch(sl.id, { anim: e.target.value as HeroSlide["anim"] })} style={{ ...inp, height: 30 }}>
                {HERO_ANIMS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            )}
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 11, color: "var(--ink-500)", flexShrink: 0 }}>
            Segundos
            <input type="number" aria-label={`Segundos de la diapositiva ${k + 1}`} min={HERO_SECS_MIN} max={HERO_SECS_MAX} step={0.5} defaultValue={sl.secs ?? ""} placeholder={String(heroSlideSecs({ kind: sl.kind }))} onBlur={(e) => { const n = parseFloat(e.target.value); patch(sl.id, { secs: Number.isFinite(n) && n > 0 ? Math.min(HERO_SECS_MAX, Math.max(HERO_SECS_MIN, n)) : undefined }); }} style={{ ...inp, height: 30, width: 64, padding: "0 6px" }} />
          </label>
          <button type="button" aria-label="Subir" disabled={k === 0} onClick={() => move(k, -1)} style={{ ...small, opacity: k === 0 ? 0.4 : 1 }}>↑</button>
          <button type="button" aria-label="Bajar" disabled={k === slides.length - 1} onClick={() => move(k, 1)} style={{ ...small, opacity: k === slides.length - 1 ? 0.4 : 1 }}>↓</button>
          {trash(() => drop(sl), "Quitar diapositiva")}
        </div>
      ))}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <label style={addStyle(full)}>
          <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Agregar foto al hero" disabled={full} onChange={onFile} style={{ display: "none" }} />
          + Foto
        </label>
        <label style={addStyle(full || busy)}>
          <input type="file" accept="video/mp4,video/webm" aria-label="Subir video al hero" disabled={full || busy} onChange={onVideo} style={{ display: "none" }} />
          {busy ? "Subiendo…" : "+ Video"}
        </label>
        <button type="button" disabled={full} onClick={() => add({ kind: "video", src: "" })} style={addStyle(full)}>+ Video por enlace</button>
        <button type="button" disabled={full} onClick={() => add({ kind: "anim", anim: HERO_ANIMS[slides.filter((x) => x.kind === "anim").length % HERO_ANIMS.length][0] })} style={addStyle(full)}>+ Animación</button>
      </div>
      {full && <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Máximo {MAX_HERO_SLIDES} diapositivas.</div>}
    </>
  );
}

/** Banner del sitio: imagen ancha (y una para móvil), enlace y texto alternativo. Reemplaza a la franja de cifras. */
function BannerEditor({ banner }: { banner: SiteBanner }) {
  const set = (p: Partial<SiteBanner>) => commit((x) => ({ banner: { ...x.banner, ...p } }));
  const del = (k: "img" | "imgMobile") => commit((x) => { const b = { ...x.banner }; delete b[k]; return { banner: b }; });
  const bad = !!banner.link?.trim() && !bannerHref(banner.link);
  return (
    <>
      <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
        Aparece a todo el ancho después de los servicios. Imagen de computadora recomendada: 1600 × 500 px. La imagen para móvil es opcional (900 × 600 px): si no la subes, se usa la misma.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
        {([["img", "Banner (computadora)", 1600], ["imgMobile", "Banner (móvil)", 900]] as const).map(([k, label, max]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
            <Pick src={banner[k]} label={label} h={88} icon="upload" max={max} onPick={(u) => set({ [k]: u })} />
            <button type="button" onClick={() => del(k)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--error-fg)", visibility: banner[k] ? "visible" : "hidden", background: "transparent", border: 0, textAlign: "left", padding: 0 }}>Quitar</button>
          </div>
        ))}
      </div>
      <input aria-label="Enlace del banner" value={banner.link ?? ""} onChange={(e) => set({ link: e.target.value })} placeholder="Enlace al hacer clic (opcional): https://… o /reserva" style={{ ...inp, height: 34, padding: "0 10px", border: bad ? "2px solid var(--error-fg)" : inp.border }} />
      {bad && <div role="alert" style={{ fontSize: 12, color: "var(--error-fg)" }}>El enlace debe empezar con https:// o con / (una página del sitio).</div>}
      <input aria-label="Texto del banner (para accesibilidad)" value={banner.alt ?? ""} onChange={(e) => set({ alt: e.target.value })} placeholder="Texto del banner (lo leen los lectores de pantalla)" style={{ ...inp, height: 34, padding: "0 10px" }} />
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, fontWeight: 600 }}>
        <input type="checkbox" checked={banner.on !== false} onChange={(e) => set({ on: e.target.checked })} />
        Mostrar el banner en el sitio
      </label>
    </>
  );
}

/** Aviso para mover al almacenamiento las fotos que quedaron dentro del documento (hacen pesada la primera carga del sitio). */
function MoveImages() {
  const [busy, setBusy] = useState(false);
  const [raw] = mediaStore.useStore();
  const n = countInlineImages(raw);
  if (n === 0) return null;
  async function run() {
    setBusy(true);
    const { value, moved } = await hostAllImages(mediaStore.get());
    setBusy(false);
    if (!moved) return toast("No se pudieron mover las imágenes (¿tienes rol de administrador y conexión?)");
    mediaStore.set(value);
    toast(`${moved} ${moved === 1 ? "imagen movida" : "imágenes movidas"} al almacenamiento · el sitio cargará más rápido`);
  }
  return (
    <div role="note" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)", fontSize: 13, lineHeight: 1.45 }}>
      <span style={{ flex: 1, minWidth: 220 }}><b>{n} {n === 1 ? "imagen está" : "imágenes están"} guardada{n === 1 ? "" : "s"} dentro del documento del sitio</b>, lo que hace más pesada cada carga. Muévelas al almacenamiento para que solo viaje un enlace.</span>
      <button type="button" disabled={busy} onClick={run} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 14px", minHeight: 40, fontWeight: 700, fontSize: 13, background: "var(--surface)", color: "var(--ink-900)", fontFamily: "inherit" }}>{busy ? "Moviendo…" : "Mover imágenes"}</button>
    </div>
  );
}
