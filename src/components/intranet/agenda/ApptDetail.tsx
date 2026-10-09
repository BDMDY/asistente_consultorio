"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { type Appt, STATUS_LABEL, apptWhenShort, hm } from "@/lib/agenda";
import { agendaStore, removeAppts } from "@/lib/agenda-store";
import { balanceFor, confirmAppt, reactivateAppt, startAttention } from "@/lib/agenda-actions";
import { inProgress, isClosed, limaHM, minutesBetween } from "@/lib/attention";
import { labelShort } from "@/lib/dates";
import { modStore } from "@/lib/mod";
import { patientOf, patientsStore } from "@/lib/patients";
import { money, paymentsStore } from "@/lib/payments";
import { useBrand } from "@/lib/brand";
import { openSessionReceipt } from "@/lib/receipts-open";
import { apptCode, sessionGroup } from "@/lib/receipts";
import { currentUser, sessionStore } from "@/lib/session";
import { matUseOf, undoLiquidation } from "@/lib/materials";
import { toast } from "@/lib/toast";
import MaterialsDialog from "./MaterialsDialog";

/** Contenido del detalle de una cita (panel lateral en escritorio, hoja inferior en móvil). */
export default function ApptDetail({ a, doctor, alerts, paid, onResize, onResched, onPay, onCancel, onClose, compact }: {
  a: Appt; doctor: string; alerts: string[]; paid: number;
  onResize: (dur: number) => void;
  onResched: () => void; onPay: () => void; onCancel: () => void; onClose?: () => void; compact?: boolean;
}) {
  const open = a.st !== "cancelada" && a.st !== "atendida";
  const [session] = sessionStore.useStore();
  const [mod] = modStore.useStore();
  const [sure, setSure] = useState(false);
  const router = useRouter();
  const brand = useBrand();
  const [payments] = paymentsStore.useStore();
  const [patients] = patientsStore.useStore();
  const group = sessionGroup(a.id, payments, [a]);
  const patient = patientOf(patients, a);
  const openPatient = (inAttention = true) => router.push(`/intranet/pacientes?id=${patient!.id}${inAttention ? `&atencion=${a.id}` : ""}`);
  const isAdmin = currentUser(session, mod)?.rol === "Administrador";

  const running = inProgress(a);
  const canStart = !a.t0 && !isClosed(a);

  const [mats, setMats] = useState<null | "finish" | "late">(null);
  const used = matUseOf(mod.mats, a.id);

  function reactivate() {
    const r = reactivateAppt(a);
    if ("error" in r) return toast(r.error);
    toast("Cita reactivada · pendiente de confirmar", r.undo);
  }

  function remove() {
    const copy = a;
    removeAppts([a.id]);
    setSure(false);
    onClose?.();
    toast("Cita eliminada", () => agendaStore.update((s) => ({ ...s, appts: [...s.appts, copy] })));
  }
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
        <span style={{ color: "var(--ink-500)" }}>Código de cita <b className="tnum" style={{ color: "var(--ink-900)" }}>{apptCode(a.id)}</b></span><br />
        Saldo: <b>{money(balanceFor(a, paid))}</b>
        {a.notes && <><br /><span style={{ color: "var(--ink-500)" }}>{a.notes}</span></>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Duración de la cita">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Duración</span>
        <button type="button" aria-label="Reducir 15 minutos" disabled={isClosed(a) || a.dur <= 1} onClick={() => onResize(a.dur - 1)} style={stepBtn(isClosed(a) || a.dur <= 1)}>−15</button>
        <b className="tnum" style={{ minWidth: 58, textAlign: "center" }}>{a.dur * 15} min</b>
        <button type="button" aria-label="Extender 15 minutos" disabled={isClosed(a)} onClick={() => onResize(a.dur + 1)} style={stepBtn(isClosed(a))}>+15</button>
      </div>
      {(a.t0 || a.t1) && (
        <div role="status" className="tnum" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 10, background: a.t1 ? "var(--success-bg)" : "var(--info-bg)", color: a.t1 ? "var(--success-fg)" : "var(--info-fg)", fontWeight: 600 }}>
          {a.t1 && a.t0 ? `Atendida de ${limaHM(a.t0)} a ${limaHM(a.t1)} · ${minutesBetween(a.t0, a.t1)} min (programados ${a.dur * 15})` : a.t0 ? `En atención desde las ${limaHM(a.t0)}` : ""}
        </div>
      )}
      {!compact && <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>Teclado: con la cita enfocada, ↑ ↓ la mueven 15 min, ← → la cambian de doctor y Mayús + ↑ ↓ cambian su duración.</div>}
      <div style={{ flex: 1 }} />
      {canStart && !a.t0 && (
        <button type="button" onClick={() => {
          startAttention(a);
          if (patient) { toast("Atención iniciada · ficha del paciente"); openPatient(); }
          else toast("Atención iniciada. Este paciente aún no tiene ficha: regístralo en Pacientes.");
        }} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "var(--info-bg)", color: "var(--info-fg)", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Iniciar atención</button>
      )}
      {group.lines.length > 0 && (
        <button type="button" onClick={() => { if (!openSessionReceipt(group, { clinic: brand.name, doctor })) toast("Permite ventanas emergentes para ver el comprobante"); }} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "var(--success-bg)", color: "var(--success-fg)", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Comprobante de la cita · {money(group.total)} ({group.lines.length} {group.lines.length === 1 ? "tratamiento" : "tratamientos"})</button>
      )}
      {patient && (
        <button type="button" onClick={() => openPatient(running)} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: running ? "var(--info-bg)" : "transparent", boxShadow: running ? "none" : "inset 0 0 0 1px var(--line)", color: running ? "var(--info-fg)" : "var(--brand-text)", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Abrir ficha del paciente</button>
      )}
      {running && (
        <button type="button" onClick={() => setMats("finish")} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Finalizar atención</button>
      )}
      {used && <div role="note" className="tnum" style={{ fontSize: 13, padding: "8px 12px", borderRadius: 10, background: "var(--surface-2, var(--brand-50))", color: "var(--ink-700)" }}><b>Materiales liquidados:</b> {used.lines.map((l) => `${l.n} ×${l.qty} ${l.u}`).join(" · ")}<button type="button" onClick={() => { if (undoLiquidation(a.id)) toast("Liquidación deshecha · el stock volvió al inventario"); }} style={{ display: "block", marginTop: 4, cursor: "pointer", background: "transparent", border: 0, padding: 0, color: "var(--error-fg)", fontWeight: 700, fontSize: 12, fontFamily: "inherit" }}>Deshacer liquidación</button></div>}
      {!used && a.t1 && <button type="button" onClick={() => setMats("late")} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "transparent", boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--brand-text)", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Liquidar materiales</button>}
      {mats && <MaterialsDialog a={a} finish={mats === "finish"} onClose={() => setMats(null)} />}
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
      {isAdmin && a.st === "cancelada" && (
        <button type="button" onClick={reactivate} style={{ cursor: "pointer", border: 0, padding: 13, minHeight: 48, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>Reactivar cita</button>
      )}
      {isAdmin && (
        sure ? (
          <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "var(--error-bg)" }}>
            <b style={{ fontSize: 13, color: "var(--error-fg)" }}>¿Eliminar esta cita definitivamente? Cancelarla conserva el historial.</b>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" onClick={() => setSure(false)} style={ghost(false)}>No, volver</button>
              <button type="button" onClick={remove} style={{ ...ghost(false), background: "var(--error-fg)", color: "#fff", boxShadow: "none" }}>Sí, eliminar</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={paid > 0} onClick={() => setSure(true)} title={paid > 0 ? "Tiene cobros registrados: no se puede eliminar" : undefined} style={{ cursor: paid > 0 ? "not-allowed" : "pointer", background: "transparent", border: 0, textAlign: "center", color: paid > 0 ? "var(--ink-300)" : "var(--ink-500)", fontWeight: 600, fontSize: 13, minHeight: 36, fontFamily: "inherit" }}>
            {paid > 0 ? "No se puede eliminar: tiene cobros" : "Eliminar cita (solo administrador)"}
          </button>
        )
      )}
    </div>
  );
}

const stepBtn = (disabled: boolean): React.CSSProperties => ({ cursor: disabled ? "not-allowed" : "pointer", border: 0, minWidth: 52, minHeight: 40, borderRadius: 10, boxShadow: "inset 0 0 0 1px var(--line)", background: "transparent", color: disabled ? "var(--ink-300)" : "inherit", fontWeight: 700, fontSize: 14, fontFamily: "inherit" });

const ghost = (disabled: boolean): React.CSSProperties => ({ cursor: disabled ? "not-allowed" : "pointer", border: 0, padding: 12, minHeight: 46, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", textAlign: "center", background: "transparent", color: disabled ? "var(--ink-300)" : "inherit", fontWeight: 700, fontSize: 14, fontFamily: "inherit" });

export function StatusPill({ st }: { st: Appt["st"] }) {
  return <span style={{ alignSelf: "flex-start", whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--st-${st}-bg)`, color: `var(--st-${st}-fg)` }}>{STATUS_LABEL[st]}</span>;
}

/** Detalle de un bloqueo de horario (almuerzo, reunión…): ajustar su duración o quitarlo. */
export function BlockDetail({ a, doctor, onResize, onClose, compact }: { a: Appt; doctor: string; onResize: (dur: number) => void; onClose?: () => void; compact?: boolean }) {
  const [{ appts }] = agendaStore.useStore();
  const [sure, setSure] = useState(false);
  const same = appts.filter((x) => x.st === "bloqueo" && x.doc === a.doc && x.p === a.p && x.slot === a.slot && x.dur === a.dur && x.date >= a.date);

  function remove(list: Appt[], msg: string) {
    removeAppts(list.map((x) => x.id));
    setSure(false);
    onClose?.();
    toast(msg, () => agendaStore.update((s) => ({ ...s, appts: [...s.appts, ...list] })));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 18 }}>Horario bloqueado</b>
        {!compact && onClose && <button type="button" onClick={onClose} aria-label="Cerrar" style={{ cursor: "pointer", background: "transparent", border: 0, color: "inherit" }}><Icon name="x" /></button>}
      </div>
      <StatusPill st="bloqueo" />
      <div><b style={{ fontSize: 20 }}>{a.p}</b><div className="tnum" style={{ color: "var(--ink-500)", fontSize: 14 }}>{labelShort(a.date)} · {hm(a.slot)}–{hm(a.slot + a.dur)} · {doctor}</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} role="group" aria-label="Duración del bloqueo">
        <span style={{ fontSize: 14, fontWeight: 600 }}>Duración</span>
        <button type="button" aria-label="Reducir 15 minutos" disabled={a.dur <= 1} onClick={() => onResize(a.dur - 1)} style={stepBtn(a.dur <= 1)}>−15</button>
        <b className="tnum" style={{ minWidth: 58, textAlign: "center" }}>{a.dur * 15} min</b>
        <button type="button" aria-label="Extender 15 minutos" onClick={() => onResize(a.dur + 1)} style={stepBtn(false)}>+15</button>
      </div>
      <div style={{ flex: 1 }} />
      {sure ? (
        <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "var(--error-bg)" }}>
          <b style={{ fontSize: 13, color: "var(--error-fg)" }}>¿Quitar este bloqueo? Ese horario volverá a estar disponible.</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => setSure(false)} style={ghost(false)}>No, volver</button>
            <button type="button" onClick={() => remove([a], "Bloqueo quitado")} style={{ ...ghost(false), background: "var(--error-fg)", color: "#fff", boxShadow: "none" }}>Sí, quitar</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setSure(true)} style={{ ...ghost(false), color: "var(--error-fg)" }}>Quitar bloqueo</button>
          {same.length > 1 && <button type="button" onClick={() => remove(same, `${same.length} bloqueos quitados`)} style={{ ...ghost(false), color: "var(--error-fg)" }}>Quitar este y los {same.length - 1} siguientes iguales</button>}
        </>
      )}
    </div>
  );
}
