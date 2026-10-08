"use client";
import Icon from "@/components/ui/Icon";
import { hm } from "@/lib/agenda";
import { type DelayAlert, startMin } from "@/lib/attention";
import type { OutboxItem } from "@/lib/outbox";

const hmMin = (m: number) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const btn: React.CSSProperties = { cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 14px", minHeight: 40, fontWeight: 700, fontSize: 13, fontFamily: "inherit" };

/** Aviso al asistente: la atención en curso ya pasó su hora de fin y hay un paciente por llegar. */
export default function DelayAlerts({ alerts, doctorName, outbox, onExtend, onContact, onResched, onSelect }: {
  alerts: DelayAlert[];
  doctorName: (id: number) => string;
  outbox: OutboxItem[];
  onExtend: (a: DelayAlert) => void;
  onContact: (a: DelayAlert) => void;
  onResched: (a: DelayAlert) => void;
  onSelect: (id: number) => void;
}) {
  if (!alerts.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 28px 0" }} aria-label="Avisos de demora">
      {alerts.map((al) => {
        const sent = outbox.filter((o) => o.kind === "demora" && o.apptId === al.next.id).pop();
        return (
          <div key={al.current.id} role="alert" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "12px 14px", borderRadius: 14, background: "var(--warning-bg)", color: "var(--warning-fg)" }}>
            <Icon name="clock" />
            <div style={{ flex: 1, minWidth: 220, fontSize: 14, lineHeight: 1.45 }}>
              <b>{doctorName(al.current.doc)} sigue con {al.current.p}</b> (programada hasta las {hm(al.current.slot + al.current.dur)}, {al.overrun} min de más, sin marcar el fin).{" "}
              Próximo: <button type="button" onClick={() => onSelect(al.next.id)} style={{ background: "transparent", border: 0, padding: 0, fontWeight: 800, textDecoration: "underline", color: "inherit", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit" }}>{al.next.p}</button> a las {hmMin(startMin(al.next))}
              {al.wait > 0 ? ` (ya espera ${al.wait} min)` : ""}.
              {sent && <b> Ya se le avisó.</b>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onExtend(al)} style={{ ...btn, background: "var(--surface)", color: "var(--ink-900)" }}>Extender +15 min</button>
              <button type="button" onClick={() => onContact(al)} style={{ ...btn, background: "var(--warning-fg)", color: "#fff" }}>{sent ? "Avisar de nuevo" : `Avisar a ${al.next.p.split(" ")[0]}`}</button>
              <button type="button" onClick={() => onResched(al)} style={{ ...btn, background: "var(--surface)", color: "var(--ink-900)" }}>Reprogramar al siguiente</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
