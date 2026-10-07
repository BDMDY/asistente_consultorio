"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { Modal } from "@/components/ui/kit";
import { type Appt, STATUS_LABEL, type ApptStatus, hm } from "@/lib/agenda";
import { labelShort } from "@/lib/dates";
import { initials } from "@/lib/media";
import type { AgendaCtx } from "./Agenda";
import ApptDetail from "./ApptDetail";

const SLOT_H = 18;
const HEAD_H = 44;
const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const ORDER: ApptStatus[] = ["atendida", "pendiente", "confirmada", "en-sala", "cancelada", "no-show", "reprogramada"];
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
const navBtn: React.CSSProperties = { cursor: "pointer", width: 40, height: 40, borderRadius: 10, background: "var(--surface)", boxShadow: "inset 0 0 0 1px var(--line)", display: "flex", alignItems: "center", justifyContent: "center", border: 0, color: "inherit" };

// ───────────────────────── Escritorio ─────────────────────────

export function AgendaDesktop({ ctx }: { ctx: AgendaCtx }) {
  const { date, docs, appts, selId } = ctx;
  const [dragId, setDragId] = useState<number | null>(null);
  const day = appts.filter((a) => a.date === date);
  const sel = appts.find((a) => a.id === selId) ?? null;

  function onKey(e: React.KeyboardEvent, a: Appt) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); return ctx.setSel(a.id); }
    const di = docs.findIndex((d) => d.id === a.doc);
    const to = { doc: a.doc, slot: a.slot };
    if (e.key === "ArrowUp") to.slot -= 1;
    else if (e.key === "ArrowDown") to.slot += 1;
    else if (e.key === "ArrowLeft") to.doc = docs[di - 1]?.id ?? -1;
    else if (e.key === "ArrowRight") to.doc = docs[di + 1]?.id ?? -1;
    else return;
    e.preventDefault();
    ctx.move(a, to);
  }

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14, minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Agenda</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" onClick={() => ctx.go(-1)} aria-label="Anterior" style={navBtn}><Icon name="chevron-left" /></button>
            <b style={{ minWidth: 170, textAlign: "center", fontSize: 16 }} aria-live="polite">{cap(labelShort(date))}</b>
            <button type="button" onClick={() => ctx.go(1)} aria-label="Siguiente" style={navBtn}><Icon name="chevron-right" /></button>
            <button type="button" onClick={ctx.goToday} style={{ ...navBtn, width: "auto", padding: "0 14px", fontWeight: 700, fontSize: 13 }}>Hoy</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => ctx.open({ kind: "new", mode: "series" })} style={{ cursor: "pointer", padding: "13px 16px", borderRadius: 12, background: "var(--surface)", boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-700)", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" }}>Citas en serie</button>
          <button type="button" onClick={() => ctx.open({ kind: "new", mode: "single" })} style={{ cursor: "pointer", padding: "13px 18px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" }}>+ Nueva cita</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {ORDER.map((k) => <span key={k} style={{ whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--st-${k}-bg)`, color: `var(--st-${k}-fg)` }}>{STATUS_LABEL[k]}</span>)}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--ink-500)" }}>Clic en un hueco para agendar · arrastra una cita o usa las flechas del teclado</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 340px", gap: 16, alignItems: "start" }}>
        <div style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-md)", display: "grid", gridTemplateColumns: `56px repeat(${docs.length}, minmax(0,1fr))`, overflow: "hidden" }}>
          <div style={{ paddingTop: HEAD_H }}>
            {HOURS.map((h) => <div key={h} className="tnum" style={{ height: SLOT_H * 4, fontSize: 12, color: "var(--ink-500)", textAlign: "right", paddingRight: 8, boxSizing: "border-box", marginTop: -6 }}>{h}</div>)}
          </div>
          {docs.map((d) => (
            <div key={d.id} style={{ borderLeft: "1px solid var(--line)", position: "relative", height: HEAD_H + SLOT_H * 32 }}>
              <div style={{ height: HEAD_H, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", fontWeight: 700, fontSize: 14, borderBottom: "1px solid var(--line)" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--brand-100)", color: "var(--brand-800)", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(d.name)}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              </div>
              <div style={{ position: "absolute", top: HEAD_H, left: 0, right: 0, bottom: 0 }}>
                {Array.from({ length: 32 }, (_, k) => (
                  <div key={k} className="da-slot" role="button" tabIndex={-1} aria-label={`Agendar ${hm(k)} con ${d.name}`}
                    onClick={() => ctx.open({ kind: "new", mode: "single", doc: d.id, time: hm(k) })}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const a = appts.find((x) => x.id === dragId); if (a) ctx.move(a, { doc: d.id, slot: Math.min(k, 32 - a.dur) }); setDragId(null); }}
                    style={{ cursor: "pointer", height: SLOT_H, boxSizing: "border-box", borderTop: k % 4 === 0 ? "1px solid var(--line)" : "1px dashed rgba(220,229,224,.5)" }} />
                ))}
              </div>
              {day.filter((a) => a.doc === d.id).map((a) => (
                <div key={a.id} role="button" tabIndex={0} draggable aria-pressed={selId === a.id}
                  aria-label={`${a.p}, ${a.s}, ${hm(a.slot)}, ${d.name}, ${STATUS_LABEL[a.st]}`}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(a.id)); setDragId(a.id); }}
                  onDragEnd={() => setDragId(null)}
                  onKeyDown={(e) => onKey(e, a)}
                  onClick={(e) => { e.stopPropagation(); ctx.setSel(a.id); }}
                  style={{ position: "absolute", left: 6, right: 6, top: HEAD_H + a.slot * SLOT_H, height: a.dur * SLOT_H - 2, borderRadius: 10, padding: "6px 10px", boxSizing: "border-box", background: `var(--st-${a.st}-bg)`, color: `var(--st-${a.st}-fg)`, fontSize: 13, overflow: "hidden", cursor: "grab", boxShadow: selId === a.id ? "0 0 0 2px var(--brand-500)" : "none", opacity: a.st === "cancelada" ? 0.6 : 1 }}>
                  <b>{a.p}</b>
                  <div className="tnum" style={{ opacity: 0.85, fontSize: 12 }}>{hm(a.slot)}–{hm(a.slot + a.dur)} · {a.s}{a.web ? " · Web" : ""}</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <aside aria-label="Detalle de la cita" style={{ background: "var(--surface)", borderRadius: 16, boxShadow: "var(--shadow-lg)", padding: 22, display: "flex", flexDirection: "column", gap: 14, minHeight: 360, position: "sticky", top: 16 }}>
          {!sel ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 8, color: "var(--ink-500)" }}>
              <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--brand-50)", color: "var(--brand-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="mouse-pointer-click" /></span>
              <b style={{ color: "var(--ink-900)" }}>Selecciona una cita</b>
              <span style={{ fontSize: 13 }}>Verás el detalle y las acciones.</span>
            </div>
          ) : (
            <ApptDetail a={sel} doctor={docs.find((d) => d.id === sel.doc)?.name ?? ""} alerts={ctx.alerts(sel.p)} paid={ctx.paid(sel.id)}
              onResched={() => ctx.open({ kind: "resched" })} onPay={() => ctx.open({ kind: "pay" })} onCancel={() => ctx.open({ kind: "cancel" })} onClose={() => ctx.setSel(null)} />
          )}
        </aside>
      </div>
      <style>{`.da-slot:hover{background:var(--brand-50)}`}</style>
    </div>
  );
}

// ───────────────────────── Móvil ─────────────────────────

export function AgendaMobile({ ctx }: { ctx: AgendaCtx }) {
  const { date, docs, appts, selId } = ctx;
  const [docF, setDocF] = useState<number | null>(null);
  const [detail, setDetail] = useState(false);
  const list = appts.filter((a) => a.date === date && (docF === null || a.doc === docF)).sort((x, y) => x.slot - y.slot);
  const sel = appts.find((a) => a.id === selId) ?? null;
  const short = (n: string) => n.replace(/^(Dra?\.)\s*/, "$1 ").split(" ").slice(0, 3).join(" ");
  const chip = (on: boolean): React.CSSProperties => ({ cursor: "pointer", whiteSpace: "nowrap", padding: "9px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, border: 0, fontFamily: "inherit", background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)" });
  const act = (d: Parameters<AgendaCtx["open"]>[0]) => { setDetail(false); ctx.open(d); };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 112px)" }}>
      <div style={{ padding: "12px 16px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button type="button" onClick={() => ctx.go(-1)} aria-label="Anterior" style={{ ...navBtn, width: 44, height: 44, border: 0, background: "transparent", boxShadow: "none" }}><Icon name="chevron-left" /></button>
          <button type="button" onClick={ctx.goToday} aria-label="Ir a hoy" style={{ fontSize: 17, fontWeight: 800, background: "transparent", border: 0, color: "inherit", fontFamily: "inherit", cursor: "pointer" }} aria-live="polite">{cap(labelShort(date))}</button>
          <button type="button" onClick={() => ctx.go(1)} aria-label="Siguiente" style={{ ...navBtn, width: 44, height: 44, border: 0, background: "transparent", boxShadow: "none" }}><Icon name="chevron-right" /></button>
        </div>
        <div style={{ display: "flex", gap: 6, overflow: "auto" }}>
          <button type="button" style={chip(docF === null)} onClick={() => setDocF(null)}>Todos</button>
          {docs.map((d) => <button key={d.id} type="button" style={chip(docF === d.id)} onClick={() => setDocF(d.id)}>{short(d.name)}</button>)}
        </div>
      </div>

      <div style={{ flex: 1, padding: "14px 16px 90px", display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((a) => (
          <button key={a.id} type="button" onClick={() => { ctx.setSel(a.id); setDetail(true); }} style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center", background: "var(--surface)", border: 0, borderRadius: 14, padding: 12, boxShadow: selId === a.id ? "0 0 0 2px var(--brand-500)" : "var(--shadow-md)", minHeight: 58, textAlign: "left", color: "inherit", fontFamily: "inherit", opacity: a.st === "cancelada" ? 0.6 : 1 }}>
            <span className="tnum" style={{ width: 48, fontWeight: 700, fontSize: 14 }}>{hm(a.slot)}</span>
            <span style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
              <b>{a.p}</b>
              <span style={{ display: "block", color: "var(--ink-500)", fontSize: 12 }}>{a.s}{a.web ? " · Web" : ""} · {short(docs.find((d) => d.id === a.doc)?.name ?? "")}</span>
            </span>
            <span style={{ whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--st-${a.st}-bg)`, color: `var(--st-${a.st}-fg)` }}>{STATUS_LABEL[a.st]}</span>
          </button>
        ))}
        {list.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", color: "var(--ink-500)" }}>
            <span style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--brand-50)", color: "var(--brand-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar-x" /></span>
            <b style={{ color: "var(--ink-900)" }}>Sin citas este día</b>
            <span style={{ fontSize: 13 }}>Toca + para agendar.</span>
          </div>
        )}
      </div>

      <button type="button" onClick={() => ctx.open({ kind: "new", mode: "single" })} style={{ cursor: "pointer", position: "fixed", right: 16, bottom: 76, minHeight: 56, padding: "0 22px", borderRadius: 18, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, boxShadow: "var(--shadow-lg)", border: 0, fontFamily: "inherit", fontSize: 15, zIndex: 30 }}>
        <Icon name="plus" />Nueva cita
      </button>

      {detail && sel && (
        <Modal sheet onClose={() => setDetail(false)} label="Detalle de la cita">
          <div style={{ padding: "18px 18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
            <ApptDetail compact a={sel} doctor={docs.find((d) => d.id === sel.doc)?.name ?? ""} alerts={ctx.alerts(sel.p)} paid={ctx.paid(sel.id)}
              onResched={() => act({ kind: "resched" })} onPay={() => act({ kind: "pay" })} onCancel={() => act({ kind: "cancel" })} />
          </div>
        </Modal>
      )}
    </div>
  );
}
