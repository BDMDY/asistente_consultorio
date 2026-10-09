"use client";
import Icon from "@/components/ui/Icon";
import { type Appt, hm } from "@/lib/agenda";
import { limaHM } from "@/lib/attention";
import { limaMinutesNow } from "@/lib/dates";
import { useNowMin } from "@/lib/hooks";

/** Franja de la ficha del paciente mientras su atención está en curso: tiempo transcurrido y fin de la atención. */
export default function AtencionBanner({ a, onFinish, onBack, onAddTreatment }: { a: Appt; onFinish: () => void; onBack: () => void; onAddTreatment: () => void }) {
  const now = useNowMin();
  const t0 = a.t0 ? limaMinutesNow(new Date(a.t0)) : null;
  const elapsed = t0 !== null && now >= 0 ? Math.max(0, now - t0) : null;
  const planned = a.dur * 15;
  const over = elapsed !== null && elapsed > planned;
  return (
    <div role="status" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "12px 14px", borderRadius: 14, background: over ? "var(--warning-bg)" : "var(--info-bg)", color: over ? "var(--warning-fg)" : "var(--info-fg)" }}>
      <Icon name="stethoscope" />
      <div className="tnum" style={{ flex: 1, minWidth: 200, fontSize: 14, lineHeight: 1.45 }}>
        <b>Atención en curso · {a.s}</b>
        <div>{a.t0 ? `Desde las ${limaHM(a.t0)}` : "Paciente en sala"} · programada {hm(a.slot)}–{hm(a.slot + a.dur)}{elapsed !== null ? ` · ${elapsed} de ${planned} min${over ? " (excedida)" : ""}` : ""}</div>
      </div>
      <button type="button" onClick={onAddTreatment} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 14px", minHeight: 40, fontWeight: 700, fontSize: 13, background: "var(--surface)", color: "var(--ink-900)", fontFamily: "inherit" }}>+ Agregar tratamiento</button>
      <button type="button" onClick={onBack} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 14px", minHeight: 40, fontWeight: 700, fontSize: 13, background: "var(--surface)", color: "var(--ink-900)", fontFamily: "inherit" }}>Volver a la agenda</button>
      <button type="button" onClick={onFinish} style={{ cursor: "pointer", border: 0, borderRadius: 10, padding: "9px 14px", minHeight: 40, fontWeight: 700, fontSize: 13, background: "var(--grad-btn)", color: "#fff", fontFamily: "inherit" }}>Finalizar atención</button>
    </div>
  );
}
