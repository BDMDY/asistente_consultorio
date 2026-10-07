"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { type BrandConfig, brandStore, useBrand } from "@/lib/brand";
import { BRAND_STEPS, contrast } from "@/lib/color";
import { loadImage } from "@/lib/image";
import { type MediaImages, mediaStore, resolveMedia, useMedia } from "@/lib/media";
import { toast } from "@/lib/toast";
import MediaEditor from "./MediaEditor";
import s from "./marca.module.css";

const TABS = ["Identidad", "Contacto", "Textos", "Imágenes"];
const PRIMARY = ["#00A86B", "#2F6FDE", "#7440DD", "#DC4D2D"];
const ACCENT = ["#F5A524", "#34C58B", "#DC4D2D", "#2F6FDE"];
const FONTS: [string, string][] = [["Plus Jakarta Sans", "'Plus Jakarta Sans'"], ["Inter + Lora", "Inter"], ["DM Sans + Source Serif 4", "'DM Sans'"]];
const input: React.CSSProperties = { height: 48, borderRadius: 12, border: "1px solid var(--line)", padding: "0 14px", fontSize: 16, background: "var(--surface)", color: "inherit", width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5 };
const h3: React.CSSProperties = { fontSize: 13, fontWeight: 700 };

const save = (p: Partial<BrandConfig>) => brandStore.update((b) => ({ ...b, ...p }));

function Swatches({ list, cur, onPick, label, free }: { list: string[]; cur: string; onPick: (h: string) => void; label: string; free: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      {list.map((h) => (
        <button key={h} type="button" aria-label={`${label} ${h}`} aria-pressed={cur.toUpperCase() === h} onClick={() => onPick(h)} style={{ cursor: "pointer", width: 44, height: 44, borderRadius: 12, background: h, border: 0, boxShadow: cur.toUpperCase() === h ? `0 0 0 3px var(--surface),0 0 0 5px ${h}` : "none" }} />
      ))}
      {free && (
        <label style={{ ...lbl, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="color" aria-label={`${label} personalizado`} value={/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#00A86B"} onChange={(e) => onPick(e.target.value.toUpperCase())} style={{ width: 44, height: 44, border: 0, padding: 0, background: "transparent", cursor: "pointer" }} />
          <span className="tnum" style={{ fontWeight: 700, fontSize: 13 }}>{cur.toUpperCase()}</span>
        </label>
      )}
    </div>
  );
}

function Drop({ label, k, dark }: { label: string; k: keyof MediaImages; dark?: boolean }) {
  const m = useMedia();
  const src = m.img[k];
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = await loadImage(f, { logo: true });
    if (!r.ok) return toast(r.error);
    mediaStore.update((p) => ({ ...p, img: { ...resolveMedia(p).img, [k]: r.dataUrl } }));
    toast("Imagen cargada");
  }
  return (
    <label style={{ cursor: "pointer", height: 78, borderRadius: 12, border: "1.5px dashed var(--brand-300)", background: dark ? "var(--brand-950)" : "var(--surface)", backgroundImage: src ? `url("${src}")` : undefined, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center", color: dark ? "var(--brand-200)" : "var(--brand-700)", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onFile} style={{ display: "none" }} />
      {!src && <span style={{ padding: 4 }}>{label}</span>}
    </label>
  );
}

export default function Marca() {
  const b = useBrand();
  const [tab, setTab] = useState(0);
  const ratio = contrast(b.vars["--brand-700"] ?? "#00704A", "#FFFFFF");
  const ok = ratio >= 4.5;
  const ramp = BRAND_STEPS.map((k) => `var(--brand-${k})`);
  const fld = (l: string, k: keyof BrandConfig) => (
    <label key={k} style={lbl}>{l}<input value={String(b[k] ?? "")} onChange={(e) => save({ [k]: e.target.value })} style={input} /></label>
  );

  return (
    <div className={s.page}>
      <div className={s.col}>
        <Link href="/intranet/modulos/configuracion" style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 44, fontWeight: 700, fontSize: 14 }}><Icon name="arrow-left" />Configuración</Link>
        <h1 style={{ fontSize: 26, letterSpacing: "-.02em", margin: 0 }}>Configuración de marca</h1>
        <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: -8 }}>Los cambios se guardan al instante y se ven en el sitio público y en la intranet.</div>
        <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--line)", fontWeight: 700, fontSize: 14, overflow: "auto" }} role="tablist">
          {TABS.map((t, i) => (
            <button key={t} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 12px", border: 0, borderBottom: `3px solid ${tab === i ? "var(--brand-500)" : "transparent"}`, color: tab === i ? "var(--brand-700)" : "var(--ink-500)", background: "transparent", font: "inherit", fontWeight: 700, whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>

        {tab === 0 && (
          <>
            <div style={h3}>Color primario</div>
            <Swatches list={PRIMARY} cur={b.hex} onPick={(hex) => save({ hex })} label="Color" free />
            <div style={{ display: "flex", gap: 2 }}>{ramp.map((c) => <span key={c} style={{ flex: 1, height: 22, background: c }} />)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: ok ? "var(--success-fg)" : "var(--error-fg)" }}>Blanco sobre tono 700: <span className="tnum">{ratio.toFixed(1)}:1</span> · {ok ? "AA correcto" : "contraste bajo, elige otro tono"}</div>
            <div style={h3}>Color de acento</div>
            <Swatches list={ACCENT} cur={b.accent} onPick={(accent) => save({ accent })} label="Acento" free />
            <div style={h3}>Tipografía</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FONTS.map(([t, ff], i) => (
                <button key={t} type="button" aria-pressed={b.f === i} onClick={() => save({ f: i })} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: ff, border: 0, color: "inherit", background: b.f === i ? "var(--brand-50)" : "var(--surface)", boxShadow: b.f === i ? "inset 0 0 0 2px var(--brand-500)" : "inset 0 0 0 1px var(--line)" }}>{t}</button>
              ))}
            </div>
            <div style={h3}>Logo y favicon</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              <Drop label="Logo claro" k="logoL" /><Drop label="Logo oscuro" k="logoD" dark /><Drop label="Favicon" k="favicon" />
            </div>
            {fld("Nombre comercial", "name")}
            {fld("Eslogan", "slogan")}
          </>
        )}
        {tab === 1 && <>{fld("Dirección", "address")}{fld("Teléfono", "phone")}{fld("WhatsApp", "whatsapp")}{fld("Correo", "email")}{fld("Instagram", "instagram")}{fld("Facebook", "facebook")}{fld("Horarios", "hours")}</>}
        {tab === 2 && <>{fld("Etiqueta superior del inicio", "kicker")}{fld("Subtítulo del inicio", "heroSub")}{fld("Título de servicios", "servicesTitle")}{fld("Título del equipo", "teamTitle")}</>}
        {tab === 3 && <MediaEditor />}
      </div>

      <div className={s.col} style={{ position: "sticky", top: 24 }}>
        <div style={{ borderRadius: 14, background: "var(--grad-hero)", boxShadow: "inset 0 0 0 1px var(--brand-100)", padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>VISTA PREVIA</span>
          <b style={{ fontSize: 13 }}>{b.name}</b>
          <b style={{ fontSize: 24, lineHeight: 1.15, fontFamily: b.head }}>{b.slogan}</b>
          <span style={{ alignSelf: "flex-start", padding: "11px 16px", borderRadius: 10, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 13 }}>Reservar cita</span>
        </div>
        <Link href="/" target="_blank" style={{ minHeight: 48, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="globe" />Ver el sitio público</Link>
        <Link href="/intranet/medios" style={{ minHeight: 48, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Icon name="image-up" />Medios con vista previa completa</Link>
      </div>
    </div>
  );
}
