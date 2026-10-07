"use client";
import Icon, { type IconName } from "@/components/ui/Icon";
import { DEFAULT_MEDIA, type Media, type MediaImages, mediaStore, resolveMedia, useMedia } from "@/lib/media";
import { loadImage } from "@/lib/image";
import { toast } from "@/lib/toast";

const inp: React.CSSProperties = { borderRadius: 8, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--surface)", color: "inherit", minWidth: 0, boxSizing: "border-box" };
const nextId = (l: { id: number }[]) => Math.max(0, ...l.map((x) => x.id)) + 1;

type ListKey = "services" | "stats" | "quotes" | "docs" | "facs" | "cases";
const commit = (fn: (m: Media) => Partial<Media>) => mediaStore.update((p) => ({ ...p, ...fn(resolveMedia(p)) }));
function setItem<K extends ListKey>(key: K, id: number, patch: Partial<Media[K][number]>) {
  commit((m) => ({ [key]: (m[key] as { id: number }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
}
function delItem(key: ListKey, id: number) {
  commit((m) => ({ [key]: (m[key] as { id: number }[]).filter((x) => x.id !== id) }));
}

/** Botón-imagen: abre el selector y guarda la foto reducida. */
function Pick({ src, label, w, h, round, icon, fit = "cover", logoMode, onPick, bg = "var(--brand-50)" }: { src?: string; label: string; w?: number | string; h: number; round?: boolean; icon: IconName; fit?: "cover" | "contain"; logoMode?: boolean; onPick: (url: string) => void; bg?: string }) {
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = await loadImage(f, { logo: logoMode });
    if (!r.ok) return toast(r.error);
    onPick(r.dataUrl);
    toast("Imagen cargada");
  }
  return (
    <label aria-label={label} title={label} style={{ cursor: "pointer", width: w ?? "100%", height: h, flexShrink: 0, borderRadius: round ? "50%" : 10, border: src ? "1.5px solid var(--brand-200)" : "1.5px dashed var(--brand-300)", background: bg, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-700)", backgroundImage: src ? `url("${src}")` : undefined, backgroundSize: fit, backgroundRepeat: "no-repeat", backgroundPosition: "center" }}>
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
const row: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" };

/** Editor de logos, fotos y listas del sitio público. Las secciones sin elementos se ocultan en el sitio. */
export default function MediaEditor({ showIdentity = true }: { showIdentity?: boolean }) {
  const m = useMedia();
  const setImg = (k: keyof MediaImages, url: string) => commit((x) => ({ img: { ...x.img, [k]: url } }));
  const delImg = (k: keyof MediaImages) => commit((x) => { const n = { ...x.img }; delete n[k]; return { img: n }; });
  const singles: [keyof MediaImages, string, "contain" | "cover", string, boolean][] = [
    ["logoL", "Logo claro", "contain", "var(--brand-50)", true], ["logoD", "Logo oscuro", "contain", "var(--brand-950)", true], ["favicon", "Favicon", "contain", "var(--brand-50)", true], ["hero", "Foto hero", "cover", "var(--brand-50)", false],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {showIdentity && section("Identidad", null, null, (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
          {singles.map(([k, label, fit, bg, logo]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
              <Pick src={m.img[k]} label={label} h={72} icon="upload" fit={fit} bg={bg} logoMode={logo} onPick={(u) => setImg(k, u)} />
              <button type="button" onClick={() => delImg(k)} style={{ cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--error-fg)", visibility: m.img[k] ? "visible" : "hidden", background: "transparent", border: 0, textAlign: "left", padding: 0 }}>Quitar</button>
            </div>
          ))}
        </div>
      ))}

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
              {trash(() => delItem("services", d.id), "Quitar servicio")}
            </div>
          ))}
        </>)}

      {section("Cifras del sitio", null, null, m.stats.map((d) => (
        <div key={d.id} style={row}>
          <input value={d.n} onChange={(e) => setItem("stats", d.id, { n: e.target.value })} aria-label="Cifra" style={{ ...inp, width: 90, height: 34, fontSize: 14, fontWeight: 700 }} />
          <input value={d.l} onChange={(e) => setItem("stats", d.id, { l: e.target.value })} aria-label="Descripción" style={{ ...inp, flex: 1, height: 34, padding: "0 10px" }} />
        </div>
      )))}

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

      {section("Equipo", m.docs.length, addBtn("+ Agregar doctor", () => commit((x) => ({ docs: [...x.docs, { id: nextId(x.docs), name: "", spec: "", cop: "", photo: "" }] }))),
        <>
          {m.docs.length === 0 && empty("Sin doctores: la sección Equipo se oculta en el sitio.")}
          {m.docs.map((d) => (
            <div key={d.id} style={{ ...row, gap: 10 }}>
              <Pick src={d.photo} label={`Foto de ${d.name || "doctor"}`} w={56} h={56} icon="user" onPick={(u) => setItem("docs", d.id, { photo: u })} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                <input aria-label="Nombre" value={d.name} onChange={(e) => setItem("docs", d.id, { name: e.target.value })} placeholder="Nombre" style={{ ...inp, height: 30, fontWeight: 600 }} />
                <div style={{ display: "flex", gap: 4 }}>
                  <input aria-label="Especialidad" value={d.spec} onChange={(e) => setItem("docs", d.id, { spec: e.target.value })} placeholder="Especialidad" style={{ ...inp, flex: 1, height: 28, fontSize: 12 }} />
                  <input aria-label="COP" value={d.cop} onChange={(e) => setItem("docs", d.id, { cop: e.target.value })} placeholder="COP" style={{ ...inp, width: 70, height: 28, fontSize: 12 }} />
                </div>
              </div>
              {trash(() => delItem("docs", d.id), "Quitar doctor")}
            </div>
          ))}
        </>)}

      {section("Instalaciones", m.facs.length, addBtn("+ Agregar foto", () => commit((x) => ({ facs: [...x.facs, { id: nextId(x.facs), cap: "", photo: "" }] }))),
        <>
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
          {m.cases.length === 0 && empty("Sin casos: la galería se oculta en el sitio.")}
          {m.cases.map((d) => (
            <div key={d.id} style={row}>
              <div style={{ position: "relative" }}><Pick src={d.before} label="Foto antes" w={64} h={56} icon="image" bg="var(--muted)" onPick={(u) => setItem("cases", d.id, { before: u })} />{!d.before && <small style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "var(--ink-500)" }}>ANTES</small>}</div>
              <div style={{ position: "relative" }}><Pick src={d.after} label="Foto después" w={64} h={56} icon="image" onPick={(u) => setItem("cases", d.id, { after: u })} />{!d.after && <small style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "var(--brand-700)" }}>DESPUÉS</small>}</div>
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
