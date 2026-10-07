"use client";
import Icon from "@/components/ui/Icon";
import { useBrand } from "@/lib/brand";
import { activeServices, useMedia } from "@/lib/media";

const bgi = (u?: string) => (u ? { backgroundImage: `url("${u}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined);

/** Vista previa en vivo del sitio público con la marca y los medios actuales. */
export default function MediaPreview() {
  const b = useBrand();
  const m = useMedia();
  const { img } = m;
  const logo = (src?: string, h = 36, name = "") => <span role="img" aria-label={name} style={{ display: "block", width: 200, height: h, backgroundImage: `url("${src}")`, backgroundRepeat: "no-repeat", backgroundSize: "contain", backgroundPosition: "left center" }} />;
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10, background: "#D9E1DD", minHeight: 0, height: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontWeight: 700, color: "#4A5F55" }}>
        <span style={{ padding: "5px 10px", borderRadius: 8, background: "#fff", color: "#10241B", display: "flex", gap: 6, alignItems: "center" }}>
          {img.favicon ? <span style={{ width: 14, height: 14, backgroundImage: `url("${img.favicon}")`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} /> : <Icon name="smile" size={14} />}{b.name}
        </span>
        <span style={{ flex: 1 }} />Vista previa en vivo · sitio público
      </div>
      <div style={{ flex: 1, borderRadius: 12, background: "var(--bone)", overflow: "auto", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 32px", background: "#fff", borderBottom: "1px solid var(--line)", color: "#10241B" }}>
          {img.logoL ? logo(img.logoL, 36, b.name) : <b style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}><span style={{ width: 32, height: 32, borderRadius: 9, background: "var(--grad-btn)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="smile" size={18} /></span>{b.name}</b>}
          <span style={{ padding: "10px 16px", borderRadius: 10, background: "var(--grad-btn)", color: "#fff", fontWeight: 600, fontSize: 13 }}>Reservar cita</span>
        </div>
        <div style={{ background: "var(--grad-hero)", padding: "40px 32px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 28, alignItems: "center", color: "var(--ink-900)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: b.head, fontSize: 38, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-.02em" }}>{b.slogan}</div>
            <div style={{ color: "var(--ink-500)", fontSize: 15 }}>{b.heroSub}</div>
          </div>
          <div style={{ height: 240, borderRadius: 16, overflow: "hidden", background: "repeating-linear-gradient(135deg,var(--brand-100) 0 12px,var(--brand-50) 12px 24px)", ...bgi(img.hero) }} />
        </div>
        {activeServices(m).length > 0 && (
          <div style={{ padding: "28px 32px 8px", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink-900)" }}>
            <b style={{ fontSize: 20 }}>{b.servicesTitle}</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
              {activeServices(m).map((s) => <div key={s.id} style={{ background: "#fff", borderRadius: 14, padding: 12, boxShadow: "var(--shadow-md)", fontSize: 13 }}><b>{s.name || "Servicio"}</b><div style={{ color: "var(--ink-500)", fontSize: 12 }}>{s.desc}</div></div>)}
            </div>
          </div>
        )}
        {m.docs.length > 0 && (
          <div style={{ padding: "28px 32px 8px", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink-900)" }}>
            <b style={{ fontSize: 20 }}>{b.teamTitle}</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12 }}>
              {m.docs.map((t) => (
                <div key={t.id} style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
                  <div style={{ height: 140, background: "repeating-linear-gradient(135deg,var(--brand-100) 0 10px,var(--brand-50) 10px 20px)", ...bgi(t.photo) }} />
                  <div style={{ padding: "10px 12px", fontSize: 13 }}><b>{t.name || "Sin nombre"}</b><div style={{ color: "var(--ink-500)", fontSize: 12 }}>{t.spec}</div><div className="tnum" style={{ color: "var(--ink-500)", fontSize: 12 }}>{t.cop ? `COP ${t.cop}` : ""}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {m.facs.length > 0 && (
          <div style={{ padding: "20px 32px 8px", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink-900)" }}>
            <b style={{ fontSize: 20 }}>Instalaciones</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
              {m.facs.map((t) => <div key={t.id} style={{ height: 130, borderRadius: 14, overflow: "hidden", position: "relative", background: "repeating-linear-gradient(135deg,var(--muted) 0 10px,#fff 10px 20px)", ...bgi(t.photo) }}><span style={{ position: "absolute", left: 8, bottom: 8, padding: "3px 8px", borderRadius: 6, background: "rgba(255,255,255,.9)", fontSize: 12, fontWeight: 700, color: "#10241B" }}>{t.cap}</span></div>)}
            </div>
          </div>
        )}
        {m.cases.length > 0 && (
          <div style={{ padding: "20px 32px 28px", display: "flex", flexDirection: "column", gap: 12, color: "var(--ink-900)" }}>
            <b style={{ fontSize: 20 }}>Casos antes / después</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
              {m.cases.map((t) => (
                <div key={t.id} style={{ background: "#fff", borderRadius: 14, padding: 10, boxShadow: "var(--shadow-md)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div style={{ height: 100, borderRadius: 10, background: "var(--muted)", ...bgi(t.before) }} />
                    <div style={{ height: 100, borderRadius: 10, background: "var(--brand-50)", ...bgi(t.after) }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ background: "var(--brand-950)", padding: "22px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--brand-200)", fontSize: 12 }}>
          {img.logoD ? logo(img.logoD, 32, b.name) : <b style={{ color: "#fff", fontSize: 16 }}>{b.name}</b>}
          Aviso de privacidad (Ley 29733)
        </div>
      </div>
    </div>
  );
}
