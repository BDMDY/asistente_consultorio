"use client";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import MediaEditor, { resetMedia } from "./MediaEditor";
import MediaPreview from "./MediaPreview";
import s from "./marca.module.css";

export default function Medios() {
  return (
    <div className={s.split}>
      <div className={s.editor}>
        <div style={{ padding: "24px 24px 12px" }}>
          <Link href="/intranet/modulos/configuracion" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36, fontWeight: 700, fontSize: 14 }}><Icon name="arrow-left" size={16} />Configuración</Link>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--brand-text)", marginTop: 6 }}>MEDIOS DEL SITIO</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.02em" }}>Logo y fotos</div>
          <div style={{ fontSize: 13, color: "var(--ink-500)" }}>PNG, JPG, WebP o SVG · máx. 2 MB. Agrega los doctores, espacios y casos que necesites. Los cambios se guardan al instante.</div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 24px 16px" }}><MediaEditor /></div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
          <button type="button" onClick={resetMedia} style={{ cursor: "pointer", padding: "13px 16px", borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", fontWeight: 700, fontSize: 14, background: "transparent", border: 0, color: "inherit", fontFamily: "inherit" }}>Restablecer</button>
          <Link href="/" target="_blank" style={{ flex: 1, padding: 13, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, textAlign: "center" }}>Ver el sitio público</Link>
        </div>
      </div>
      <div className={s.preview}><MediaPreview /></div>
    </div>
  );
}
