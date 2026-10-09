"use client";
import { useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/kit";
import { useMediaQuery } from "@/lib/media-query";
import s from "./modulos.module.css";

export type Tone = [string, string];
export const G: Tone = ["var(--success-bg)", "var(--success-fg)"];
export const W: Tone = ["var(--warning-bg)", "var(--warning-fg)"];
export const E: Tone = ["var(--error-bg)", "var(--error-fg)"];
export const N: Tone = ["var(--muted)", "var(--ink-700)"];

export interface Row { id: string; t: string; sub: string; badge: string; tone: Tone; progress?: number }
export interface ExtraBtn { label: string; icon?: IconName; onClick: () => void; pressed?: boolean }
export interface Kpi { l: string; v: string; c?: string }

/** Plantilla de módulo: encabezado, indicadores, filtros y lista; el detalle abre en panel lateral (escritorio) u hoja inferior (móvil). */
export function ModuleLayout({ title, sub, kpis, chips, chip, onChip, query, onQuery, showSearch = true, cta, onCta, rows, onOpen, panel, panelTitle, onClose, emptyHint, extra, select, toolbar }: {
  title: string; sub: string; kpis: Kpi[]; chips: string[]; chip: number; onChip: (i: number) => void;
  query: string; onQuery: (q: string) => void; showSearch?: boolean; cta: string; onCta: () => void;
  rows: Row[]; onOpen: (id: string) => void; panel: React.ReactNode | null; panelTitle: string; onClose: () => void; emptyHint?: string; /** segunda acción junto al botón principal */ extra?: ExtraBtn | ExtraBtn[]; /** selección múltiple con casillas (acciones en bloque) */ select?: { on: boolean; selected: Set<string>; toggle: (id: string) => void }; /** barra sobre la lista (por ejemplo, acciones en bloque) */ toolbar?: React.ReactNode;
}) {
  const wide = useMediaQuery("(min-width: 900px)");
  const panelBody = panel && (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <b style={{ fontSize: 20 }}>{panelTitle}</b>
        <button type="button" aria-label="Cerrar" onClick={onClose} style={{ cursor: "pointer", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "transparent", border: 0, color: "inherit" }}><Icon name="x" /></button>
      </div>
      {panel}
    </>
  );
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div className={s.titleBox}>
          <b className={s.title}>{title}</b>
          <span className={s.sub}>{sub}</span>
        </div>
        {showSearch && (
          <label className={s.search}>
            <Icon name="search" style={{ color: "var(--ink-500)" }} />
            <input value={query} onChange={(e) => onQuery(e.target.value)} aria-label="Buscar" placeholder="Buscar" />
          </label>
        )}
        {(Array.isArray(extra) ? extra : extra ? [extra] : []).map((x) => (
          <button key={x.label} type="button" className={s.cta} aria-pressed={x.pressed} onClick={x.onClick} style={{ background: x.pressed ? "var(--brand-50)" : "transparent", color: "var(--brand-text)", boxShadow: "inset 0 0 0 1.5px var(--brand-300, var(--line))" }}>{x.icon && <Icon name={x.icon} />}{x.label}</button>
        ))}
        <button type="button" className={s.cta} onClick={onCta}><Icon name="plus" />{cta}</button>
      </header>
      <div className={s.body}>
        <div className={s.main}>
          <div className={s.kpis}>
            {kpis.map((k) => (
              <div key={k.l} className={s.kpi}><span className={s.kpiL}>{k.l}</span><b className="tnum" style={{ color: k.c }}>{k.v}</b></div>
            ))}
          </div>
          <div className={s.chips} role="tablist">
            {chips.map((t, i) => (
              <button key={t} type="button" role="tab" aria-selected={i === chip} className={s.chip} data-on={i === chip} onClick={() => onChip(i)}>{t}</button>
            ))}
          </div>
          {toolbar}
          <div className={s.list}>
            {rows.map((r) => (
              <button key={r.id} type="button" className={s.row} aria-pressed={select?.on ? select.selected.has(r.id) : undefined} onClick={() => (select?.on ? select.toggle(r.id) : onOpen(r.id))} style={select?.on && select.selected.has(r.id) ? { boxShadow: "inset 0 0 0 2px var(--brand-500, var(--brand-600))" } : undefined}>
                {select?.on && <input type="checkbox" readOnly tabIndex={-1} aria-label={`Seleccionar ${r.t}`} checked={select.selected.has(r.id)} style={{ width: 20, height: 20, flexShrink: 0, pointerEvents: "none" }} />}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <b style={{ fontSize: 15 }}>{r.t}</b>
                  <span style={{ fontSize: 13, color: "var(--ink-500)" }}>{r.sub}</span>
                  {r.progress !== undefined && (
                    <div role="progressbar" aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, maxWidth: 320, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}><div style={{ width: `${r.progress}%`, height: "100%", background: "var(--grad-btn)" }} /></div>
                  )}
                </div>
                <span className="tnum" style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", background: r.tone[0], color: r.tone[1] }}>{r.badge}</span>
                <Icon name="chevron-right" style={{ color: "var(--ink-500)" }} />
              </button>
            ))}
            {rows.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--ink-500)", fontSize: 14, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                <Icon name="inbox" size={28} />{emptyHint ?? "Sin resultados. Prueba otra búsqueda o crea uno nuevo."}
              </div>
            )}
          </div>
        </div>
        {panel && wide && <aside role="dialog" aria-label={panelTitle} className={s.aside}>{panelBody}</aside>}
      </div>
      {panel && !wide && (
        <Modal sheet onClose={onClose} label={panelTitle}>
          <div style={{ padding: "20px 16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>{panelBody}</div>
        </Modal>
      )}
    </div>
  );
}

// ───────────── Piezas del panel ─────────────

export function SheetSub({ sub, badge, tone }: { sub?: string; badge?: string; tone?: Tone }) {
  if (!sub && !badge) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sub && <span style={{ fontSize: 14, color: "var(--ink-500)", lineHeight: 1.5 }}>{sub}</span>}
      {badge && <span className="tnum" style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: (tone ?? G)[0], color: (tone ?? G)[1] }}>{badge}</span>}
    </div>
  );
}

const inputCss: React.CSSProperties = { height: 48, borderRadius: 12, border: 0, boxShadow: "inset 0 0 0 1px var(--line)", padding: "0 14px", fontSize: 15, background: "var(--surface)", color: "inherit", width: "100%", boxSizing: "border-box" };

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}><label style={{ fontSize: 13, fontWeight: 700 }}>{label}</label>{children}</div>;
}

export function TextField({ label, value, onChange, num, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; num?: boolean; type?: string }) {
  return (
    <Field label={label}>
      <input style={inputCss} type={type} inputMode={num ? "decimal" : "text"} value={value} onChange={(e) => onChange(num ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)} aria-label={label} placeholder={label} />
    </Field>
  );
}

export function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <textarea style={{ ...inputCss, height: "auto", minHeight: 84, padding: "12px 14px", resize: "vertical", fontFamily: "inherit" }} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </Field>
  );
}

export function ChipField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <div role="group" aria-label={label} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((t) => (
          <button key={t} type="button" aria-pressed={t === value} onClick={() => onChange(t)} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: 0, fontFamily: "inherit", color: "var(--ink-900)", background: t === value ? "var(--brand-50)" : "var(--surface)", boxShadow: t === value ? "inset 0 0 0 2px var(--brand-500)" : "inset 0 0 0 1px var(--line)" }}>{t}</button>
        ))}
      </div>
    </Field>
  );
}

export interface ListItem { v: string; t: string; r?: string }

/** Lista desplegable con búsqueda; selección única o múltiple. */
export function ListField({ label, items, value, onChange, multi, info, minChars, maxShown, hint }: {
  label: string; items: ListItem[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; info?: string; minChars?: number; maxShown?: number; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();
  const gate = !!minChars && q.trim().length < minChars;
  let vis = items.filter((i) => !ql || `${i.t} ${i.r ?? ""}`.toLowerCase().includes(ql));
  if (gate) vis = [];
  else if (maxShown) vis = vis.slice(0, maxShown);
  const chosen = items.filter((i) => value.includes(i.v));
  const summary = chosen.length ? (multi ? `${chosen.length} seleccionado(s): ` : "") + chosen.map((i) => i.t).join(", ") : multi ? "Elegir uno o varios…" : "Elegir…";
  const pick = (i: ListItem) => {
    const on = value.includes(i.v);
    if (multi) onChange(on ? value.filter((x) => x !== i.v) : [...value, i.v]);
    else {
      onChange(on ? [] : [i.v]);
      setOpen(false);
    }
  };
  return (
    <Field label={label}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} style={{ ...inputCss, height: "auto", minHeight: 48, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: chosen.length ? "var(--ink-900)" : "var(--ink-500)" }}>{summary}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} style={{ color: "var(--ink-500)" }} />
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar en la lista" placeholder="Buscar…" style={{ ...inputCss, height: 44 }} />
          <div role="listbox" style={{ maxHeight: 224, overflow: "auto", borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", background: "var(--surface)" }}>
            {vis.map((i) => {
              const on = value.includes(i.v);
              return (
                <button key={i.v} type="button" role="option" aria-selected={on} onClick={() => pick(i)} style={{ cursor: "pointer", minHeight: 48, display: "flex", alignItems: "center", gap: 12, padding: "0 14px", border: 0, borderBottom: "1px solid var(--line)", background: on ? "var(--brand-50)" : "transparent", width: "100%", textAlign: "left", color: "inherit", fontFamily: "inherit" }}>
                  <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: multi ? 6 : "50%", boxShadow: `inset 0 0 0 2px ${on ? "var(--brand-500)" : "var(--ink-500)"}`, background: on ? "var(--brand-500)" : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 800 }}>{on ? (multi ? "✓" : "●") : ""}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{i.t}</span>
                  <span className="tnum" style={{ fontSize: 13, color: "var(--ink-500)", whiteSpace: "nowrap" }}>{i.r}</span>
                </button>
              );
            })}
            {vis.length === 0 && <div style={{ padding: 14, fontSize: 13, color: "var(--ink-500)" }}>{gate ? hint : q ? `Sin resultados para "${q}"` : "Sin resultados"}</div>}
          </div>
          {info && <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{info}</span>}
        </div>
      )}
      {!open && info && <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{info}</span>}
    </Field>
  );
}

export interface Action { t: string; run: () => void; kind?: "p" | "x" | ""; icon?: IconName; off?: boolean; tone?: Tone }

export function Actions({ items }: { items: Action[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((a) => {
        const primary = a.kind === "p";
        return (
          <button key={a.t} type="button" onClick={a.run} aria-disabled={a.off}
            style={{ cursor: "pointer", minHeight: 50, borderRadius: 12, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", fontWeight: 700, fontSize: 15, fontFamily: "inherit", border: 0, textAlign: "left", opacity: a.off ? 0.45 : 1,
              background: a.tone ? a.tone[0] : primary ? "var(--grad-btn)" : "var(--surface)", color: a.tone ? a.tone[1] : primary ? "#fff" : a.kind === "x" ? "var(--error-fg)" : "var(--ink-900)", boxShadow: primary || a.tone ? "none" : "inset 0 0 0 1px var(--line)" }}>
            <Icon name={a.icon ?? "check"} />{a.t}
          </button>
        );
      })}
    </div>
  );
}

export function BarChart({ bars }: { bars: { l: string; v: string; h: number }[] }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 150 }}>
      {bars.map((b) => (
        <div key={b.l} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, justifyContent: "flex-end", height: "100%" }}>
          <span className="tnum" style={{ fontSize: 12 }}>{b.v}</span>
          <span style={{ width: "100%", height: `${b.h}%`, minHeight: 4, borderRadius: "6px 6px 0 0", background: "var(--grad-btn)" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>{b.l}</span>
        </div>
      ))}
    </div>
  );
}
