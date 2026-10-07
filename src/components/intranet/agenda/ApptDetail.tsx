"use client";
import Icon from "@/components/ui/Icon";
import { type Appt, STATUS_LABEL, apptWhenShort, hm } from "@/lib/agenda";
import { balanceFor, confirmAppt } from "@/lib/agenda-actions";
import { labelShort } from "@/lib/dates";
import { money } from "@/lib/payments";
import { toast } from "@/lib/toast";

/** Contenido del detalle de una cita (panel lateral en escritorio, hoja inferior en móvil). */
export default function ApptDetail({ a, doctor, alerts, paid, onResched, onPay, onCancel, onClose, compact }: {
  a: Appt; doctor: string; alerts: string[]; paid: number;
  onResched: () => void; onPay: () => void; onCancel: () => void; onClose?: () => void; compact?: boolean;
}) {
  const open = a.st !== "cancelada" && a.st !== "atendida";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 18 }}>{compact ? a.p : "Detalle de cita"}</b>
        {compact
          ? <StatusPill st={a.st} />
          : onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ cursor: "pointer", background: "transparent", border: 0, color: "inherit" }}><Icon name="x" /></button>}
      </div>
      {!compact && <><StatusPill st={a.st} />
        <div><b style={{ fontSize: 20 }}>{a.p}</b><div className="tnum" style={{ color: "var(--ink-500)", fontSize: 14 }}>{labelShort(a.date)} · {hm(a.slot)}–{hm(a.slot + a.dur)}</div></div></>}
      {alerts.length > 0 && (
        <div role="note" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "10px 12px", borderRadius: 12, background: "var(--error-bg)" }}>
          <Icon name="triangle-alert" size={16} style={{ color: "var(--error-fg)" }} />
          {alerts.map((x) => <b key={x} style={{ fontSize: 12, color: "var(--error-fg)" }}>{x}</b>)}
        </div>
      )}
      <div className="tnum" style={{ fontSize: 14, lineHeight: 1.8, color: "var(--ink-700)" }}>
        {compact && <>{apptWhenShort(a)}–{hm(a.slot + a.dur)}<br /></>}
        {a.s}{a.web ? " · Reserva web" : ""}<br />{doctor}<br />
        Saldo: <b>{money(balanceFor(a, paid))}</b>
        {a.notes && <><br /><span style={{ color: "var(--ink-500)" }}>{a.notes}</span></>}
      </div>
      {!compact && <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>Teclado: con la cita enfocada, ↑ ↓ la mueven 15 min y ← → la cambian de doctor.</div>}
      <div style={{ flex: 1 }} />
      {(a.st === "pendiente" || a.st === "reprogramada") && (
        <button type="button" onClick={() => { confirmAppt(a.id); toast("Cita confirmada"); }} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Confirmar</button>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontWeight: 700, fontSize: 14 }}>
        <button type="button" disabled={!open} onClick={onResched} style={ghost(!open)}>Reprogramar</button>
        <button type="button" disabled={a.st === "cancelada" || a.st === "atendida"} onClick={onPay} style={ghost(a.st === "cancelada" || a.st === "atendida")}>Cobrar</button>
      </div>
      {a.st !== "cancelada" && a.st !== "atendida" && (
        <button type="button" onClick={onCancel} style={{ cursor: "pointer", background: "transparent", border: 0, textAlign: "center", color: "var(--error-fg)", fontWeight: 700, fontSize: 14, minHeight: 44, fontFamily: "inherit" }}>Cancelar cita</button>
      )}
    </div>
  );
}

const ghost = (disabled: boolean): React.CSSProperties => ({ cursor: disabled ? "not-allowed" : "pointer", border: 0, padding: 12, minHeight: 46, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", textAlign: "center", background: "transparent", color: disabled ? "var(--ink-300)" : "inherit", fontWeight: 700, fontSize: 14, fontFamily: "inherit" });

export function StatusPill({ st }: { st: Appt["st"] }) {
  return <span style={{ alignSelf: "flex-start", whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--st-${st}-bg)`, color: `var(--st-${st}-fg)` }}>{STATUS_LABEL[st]}</span>;
}
