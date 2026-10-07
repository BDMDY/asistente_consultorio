"use client";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

export const field: React.CSSProperties = { height: 48, borderRadius: 12, padding: "0 14px", fontSize: 15, background: "var(--surface)", border: "1px solid var(--line)", color: "inherit", width: "100%", boxSizing: "border-box" };
export const primaryBtn: React.CSSProperties = { cursor: "pointer", height: 48, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: 0, fontSize: 15, width: "100%" };
export const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 };

/** Contenedor centrado para las pantallas de acceso (registro, nueva contraseña). */
export default function AuthCard({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--grad-hero)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, boxSizing: "border-box" }}>
      <div style={{ width: 460, maxWidth: "100%", background: "var(--surface)", borderRadius: 20, boxShadow: "var(--shadow-lg)", padding: 32, display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
        <div style={{ position: "absolute", top: 10, right: 10 }}><ThemeToggle /></div>
        <BrandMark />
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{title}</h1>
          {sub && <div style={{ color: "var(--ink-500)", marginTop: 4, lineHeight: 1.5, fontSize: 14 }}>{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
