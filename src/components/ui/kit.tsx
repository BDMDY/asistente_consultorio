"use client";
import { useEffect, useId, useRef } from "react";
import Icon from "./Icon";

/** Estilos y piezas compartidas de la intranet (formularios, chips, modales). */
export const chipStyle = (on: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
  cursor: "pointer", border: 0, borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, textAlign: "center", fontFamily: "inherit",
  background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)", ...extra,
});

export const fieldStyle: React.CSSProperties = { height: 46, borderRadius: 12, border: "1px solid var(--line)", padding: "0 12px", fontSize: 14, background: "var(--surface)", color: "inherit", width: "100%", boxSizing: "border-box" };
export const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5 };
export const btnPrimary = (enabled = true): React.CSSProperties => ({ cursor: enabled ? "pointer" : "not-allowed", border: 0, borderRadius: 12, minHeight: 46, padding: "0 22px", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", background: enabled ? "var(--grad-btn)" : "var(--muted)", color: enabled ? "#fff" : "var(--ink-300)" });
export const btnOutline: React.CSSProperties = { cursor: "pointer", border: 0, borderRadius: 12, minHeight: 46, padding: "0 18px", fontWeight: 700, fontSize: 14, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "inherit", boxShadow: "inset 0 0 0 1px var(--line)" };

export function Segmented<T extends string | number>({ options, value, onChange, label, small }: { options: [T, string][]; value: T; onChange: (v: T) => void; label?: string; small?: boolean }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: 6 }}>
      {options.map(([v, t]) => (
        <button key={String(v)} type="button" aria-pressed={v === value} onClick={() => onChange(v)} style={chipStyle(v === value, { flex: 1, padding: small ? "9px 0" : "10px 0" })}>{t}</button>
      ))}
    </div>
  );
}

/** Diálogo modal accesible: Escape y clic fuera cierran; devuelve el foco al abrir. */
export function Modal({ onClose, children, width = 560, label, sheet = false, z = 110 }: { onClose: () => void; children: React.ReactNode; width?: number; label: string; sheet?: boolean; z?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input,select,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: z, background: "rgba(16,36,27,.5)", display: "flex", alignItems: sheet ? "flex-end" : "center", justifyContent: "center", padding: sheet ? 0 : 16 }}>
      <div ref={ref} id={id} role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}
        style={{ width: sheet ? "100%" : width, maxWidth: sheet ? 560 : "100%", maxHeight: sheet ? "92vh" : "92vh", overflow: "auto", background: "var(--surface)", color: "var(--ink-900)", borderRadius: sheet ? "22px 22px 0 0" : 20, boxShadow: "var(--shadow-lg)" }}>
        {children}
      </div>
    </div>
  );
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Cerrar" onClick={onClick} style={{ cursor: "pointer", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: "inherit" }}>
      <Icon name="x" />
    </button>
  );
}

export function Notice({ tone, icon, children }: { tone: "success" | "warning" | "error" | "info"; icon?: Parameters<typeof Icon>[0]["name"]; children: React.ReactNode }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} style={{ padding: "12px 14px", borderRadius: 12, background: `var(--${tone}-bg)`, color: `var(--${tone}-fg)`, fontWeight: 700, fontSize: 14, lineHeight: 1.5, display: "flex", gap: 10 }}>
      {icon && <Icon name={icon} style={{ marginTop: 2 }} />}
      <span>{children}</span>
    </div>
  );
}
