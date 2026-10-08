"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { CloseBtn, Modal, btnOutline, btnPrimary, chipStyle, fieldStyle, labelStyle } from "@/components/ui/kit";
import { agendaStore } from "@/lib/agenda-store";
import { finishAttention } from "@/lib/agenda-actions";
import { inProgress } from "@/lib/attention";
import { anamnesisStore, emptyAnam, plansStore } from "@/lib/clinical";
import { useMediaQuery } from "@/lib/media-query";
import { initials } from "@/lib/media";
import { type Patient, patientOf, patientsStore } from "@/lib/patients";
import { PAY_METHODS, type PayMethod, addPayment, money } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { todayISO } from "@/lib/dates";
import { Anamnesis } from "./Anamnesis";
import AtencionBanner from "./AtencionBanner";
import NewPatientDialog from "./NewPatientDialog";
import { Odontograma } from "./Odontograma";
import { TabArchivos, TabDatos, TabHistoria, TabPagos, TabPlan } from "./tabs";
import s from "./pac.module.css";

type TabKey = "hist" | "anam" | "odo" | "datos" | "plan" | "files" | "pagos";
const TABS: [TabKey, string][] = [["hist", "Historia clínica"], ["anam", "Historia inicial"], ["odo", "Odontograma"], ["datos", "Datos"], ["plan", "Plan de tratamiento"], ["files", "Archivos"], ["pagos", "Pagos"]];
type Modal = null | "new" | "plan" | "pay";

export default function Pacientes() {
  const params = useSearchParams();
  const router = useRouter();
  const [{ appts }] = agendaStore.useStore();
  const wide = useMediaQuery("(min-width: 900px)");
  const [patients] = patientsStore.useStore();
  const [anam] = anamnesisStore.useStore();
  const [plans] = plansStore.useStore();
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<number | null>(() => {
    const id = Number(params.get("id"));
    return id && patients.some((p) => p.id === id) ? id : (patients[0]?.id ?? null);
  });
  const [view, setView] = useState<"list" | "detail">(params.get("id") ? "detail" : "list");
  const [tab, setTab] = useState<TabKey>("hist");
  const [modal, setModal] = useState<Modal>(params.get("nuevo") ? "new" : null);
  /** se llegó desde "Iniciar atención" de la agenda: la nota clínica queda lista para escribir */
  const fromAgenda = !!params.get("atencion");

  const ql = q.trim().toLowerCase();
  const list = patients.filter((p) => !ql || `${p.name} ${p.dni} ${p.phone}`.toLowerCase().includes(ql));
  const cur = patients.find((p) => p.id === selId) ?? null;
  const showList = wide || view === "list";
  const showDetail = wide || view === "detail";
  const running = cur ? appts.find((a) => inProgress(a) && patientOf([cur], a)) : undefined;

  return (
    <div className={s.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Pacientes</h1>
          <div style={{ color: "var(--ink-500)", fontSize: 14 }}>{patients.length} registrados · incluye los creados desde la agenda y la reserva web</div>
        </div>
        <button type="button" onClick={() => setModal("new")} style={{ ...btnPrimary(), whiteSpace: "nowrap", minHeight: 46 }}>+ Nuevo paciente</button>
      </div>

      <div className={s.grid}>
        {showList && (
          <div className={s.list}>
            <div style={{ padding: 14 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar paciente" placeholder="Buscar por nombre, DNI o celular" style={{ ...fieldStyle, height: 44, fontSize: 14 }} />
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {list.map((p) => (
                <button key={p.id} type="button" onClick={() => { setSelId(p.id); setView("detail"); }} aria-current={p.id === selId}
                  style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", border: 0, borderTop: "1px solid var(--line)", background: p.id === selId ? "var(--brand-50)" : "transparent", width: "100%", textAlign: "left", color: "inherit", fontFamily: "inherit" }}>
                  <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--brand-100)", color: "var(--brand-800)", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials(p.name)}</span>
                  <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}>
                    <b>{p.name}</b>
                    <div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{p.dni || "sin DNI"} · {p.phone || "sin celular"}</div>
                  </div>
                  {p.web && <span style={{ padding: "3px 8px", borderRadius: 999, background: "var(--info-bg)", color: "var(--info-fg)", fontSize: 12, fontWeight: 700 }}>Web</span>}
                </button>
              ))}
              {list.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "var(--ink-500)", fontSize: 14 }}>Sin resultados. Crea un paciente nuevo.</div>}
            </div>
          </div>
        )}

        {showDetail && (
          <div className={s.detail}>
            {!cur ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-500)" }}>Selecciona un paciente</div>
            ) : (
              <>
                <button type="button" className={s.back} onClick={() => setView("list")}>
                  <Icon name="arrow-left" />Pacientes<span style={{ color: "var(--ink-900)", fontWeight: 800, marginLeft: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {cur.name}</span>
                </button>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--brand-100)", color: "var(--brand-800)", fontSize: 21, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{initials(cur.name)}</span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 24, fontWeight: 800 }}>{cur.name}</div>
                    <div className="tnum" style={{ color: "var(--ink-500)", fontSize: 14 }}>DNI {cur.dni || "—"} · {cur.phone || "sin celular"}{cur.email ? ` · ${cur.email}` : ""}</div>
                  </div>
                  <Link href={`/intranet/agenda?nueva=${encodeURIComponent(cur.name)}`} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>Nueva cita</Link>
                </div>
                {running && (
                  <AtencionBanner a={running} onBack={() => router.push("/intranet/agenda")} onFinish={() => { const min = finishAttention(running); toast(`Atención finalizada · ${min} min (programados ${running.dur * 15})`); }} />
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {cur.alerts.map((a) => (
                    <span key={a} style={{ padding: "7px 12px", borderRadius: 999, background: "var(--error-bg)", color: "var(--error-fg)", fontSize: 13, fontWeight: 700, display: "inline-flex", gap: 6, alignItems: "center" }}><Icon name="triangle-alert" size={14} />{a}</span>
                  ))}
                  {cur.alerts.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-500)" }}>Sin alertas médicas registradas</span>}
                  {!(anam[cur.id] ?? emptyAnam()).done && (
                    <button type="button" onClick={() => setTab("anam")} style={{ cursor: "pointer", minHeight: 36, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 999, background: "var(--warning-bg)", color: "var(--warning-fg)", fontSize: 13, fontWeight: 700, border: 0, fontFamily: "inherit" }}>Historia inicial pendiente · completar</button>
                  )}
                </div>
                <div className={s.tabs} role="tablist">
                  {TABS.map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={s.tab} onClick={() => setTab(k)}>{t}</button>)}
                </div>

                {tab === "hist" && <TabHistoria p={cur} autoFocus={fromAgenda} />}
                {tab === "anam" && <Anamnesis p={cur} onGoPlan={() => setModal("plan")} />}
                {tab === "odo" && <Odontograma p={cur} onSaved={() => setTab("hist")} />}
                {tab === "datos" && <TabDatos p={cur} />}
                {tab === "plan" && <TabPlan p={cur} plan={plans[cur.id]} onCreate={() => setModal("plan")} onPay={() => setModal("pay")} />}
                {tab === "files" && <TabArchivos p={cur} />}
                {tab === "pagos" && <TabPagos p={cur} onPay={() => setModal("pay")} />}
              </>
            )}
          </div>
        )}
      </div>

      {modal === "new" && <NewPatientDialog sheet={!wide} onClose={() => setModal(null)} toastText="Paciente creado · completa la historia inicial" onCreated={(np) => { setSelId(np.id); setView("detail"); setTab("anam"); }} />}
      {modal === "plan" && cur && <PlanDialog p={cur} sheet={!wide} onClose={() => setModal(null)} onCreated={() => setTab("plan")} />}
      {modal === "pay" && cur && <PayDialog p={cur} concept={plans[cur.id]?.name ?? ""} sheet={!wide} onClose={() => setModal(null)} onSaved={() => setTab("pagos")} />}
    </div>
  );
}

// ───────────── Diálogos ─────────────

function Frame({ title, onClose, sheet, children }: { title: string; onClose: () => void; sheet: boolean; children: React.ReactNode }) {
  return (
    <Modal onClose={onClose} width={520} label={title} sheet={sheet}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 22 }}>{title}</b><CloseBtn onClick={onClose} /></div>
        {children}
      </div>
    </Modal>
  );
}
const border = (ok: boolean, tried: boolean) => (tried && !ok ? "2px solid var(--error-fg)" : "1px solid var(--line)");

function PlanDialog({ p, sheet, onClose, onCreated }: { p: Patient; sheet: boolean; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ name: "", total: "12", price: "" });
  const [tried, setTried] = useState(false);
  const v = { name: f.name.trim().length > 2, total: parseInt(f.total, 10) > 0, price: parseFloat(f.price) > 0 };
  function save() {
    if (!(v.name && v.total && v.price)) return setTried(true);
    plansStore.update((all) => ({ ...all, [p.id]: { name: f.name.trim(), total: parseInt(f.total, 10), done: 0, price: parseFloat(f.price), paidBase: 0 } }));
    onCreated();
    onClose();
    toast("Plan creado");
  }
  const input = (ok: boolean): React.CSSProperties => ({ ...fieldStyle, height: 46, fontSize: 15, border: border(ok, tried) });
  return (
    <Frame title="Crear plan de tratamiento" onClose={onClose} sheet={sheet}>
      <label style={labelStyle}>Tratamiento<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={input(v.name)} /></label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>N.° de controles<input value={f.total} inputMode="numeric" onChange={(e) => setF({ ...f, total: e.target.value })} style={input(v.total)} /></label>
        <label style={labelStyle}>Precio total (S/)<input value={f.price} inputMode="decimal" onChange={(e) => setF({ ...f, price: e.target.value })} style={input(v.price)} /></label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
        <button type="button" onClick={save} style={btnPrimary()}>Crear plan</button>
      </div>
    </Frame>
  );
}

function PayDialog({ p, concept, sheet, onClose, onSaved }: { p: Patient; concept: string; sheet: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ concept, amount: "" });
  const [method, setMethod] = useState<PayMethod>("Efectivo");
  const [tried, setTried] = useState(false);
  const amt = parseFloat(f.amount.replace(",", "."));
  function save() {
    if (!(amt > 0)) return setTried(true);
    addPayment({ patient: p.name, concept: f.concept.trim() || "Pago", amount: amt, method, date: todayISO() });
    onSaved();
    onClose();
    toast(`Pago registrado · ${money(amt)}`);
  }
  return (
    <Frame title="Registrar pago" onClose={onClose} sheet={sheet}>
      <label style={labelStyle}>Concepto<input value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>
      <label style={labelStyle}>Monto (S/)<input value={f.amount} inputMode="decimal" className="tnum" onChange={(e) => setF({ ...f, amount: e.target.value })} style={{ ...fieldStyle, height: 50, fontSize: 20, fontWeight: 700, border: border(amt > 0, tried) }} /></label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PAY_METHODS.map((m) => <button key={m} type="button" aria-pressed={m === method} onClick={() => setMethod(m)} style={chipStyle(m === method, { padding: "11px 14px" })}>{m}</button>)}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
        <button type="button" onClick={save} style={btnPrimary()}>Registrar pago</button>
      </div>
    </Frame>
  );
}

