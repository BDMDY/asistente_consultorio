"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { CloseBtn, Modal, btnOutline, btnPrimary, chipStyle, fieldStyle, labelStyle } from "@/components/ui/kit";
import { agendaStore } from "@/lib/agenda-store";
import MaterialsDialog from "../agenda/MaterialsDialog";
import { inProgress } from "@/lib/attention";
import { type PlanItem, addItems, anamnesisStore, emptyAnam, itemBalance, payItem, planItems, plansStore, sessionPrice } from "@/lib/clinical";
import { useMediaQuery } from "@/lib/media-query";
import { activeServices, initials, parsePrice, serviceSessions, useMedia } from "@/lib/media";
import { matUseOf } from "@/lib/materials";
import { modStore, uid } from "@/lib/mod";
import { type Patient, patientOf, patientsStore } from "@/lib/patients";
import { PAY_METHODS, type PayMethod, addPayments, money } from "@/lib/payments";
import { type Appt, apptWhenShort } from "@/lib/agenda";
import { apptCode, todaysApptOf } from "@/lib/receipts";
import { toast } from "@/lib/toast";
import { todayISO } from "@/lib/dates";
import { Anamnesis } from "./Anamnesis";
import AtencionBanner from "./AtencionBanner";
import NewPatientDialog from "./NewPatientDialog";
import { Odontograma } from "./Odontograma";
import { type PlanSeed, TabArchivos, TabDatos, TabHistoria, TabPagos, TabPlan } from "./tabs";
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
  const [matsFor, setMatsFor] = useState<{ a: Appt; finish: boolean } | null>(null);
  const [modal, setModal] = useState<Modal>(params.get("nuevo") ? "new" : null);
  /** tratamientos sugeridos al crear el seguimiento clínico desde un plan de pago */
  const [seed, setSeed] = useState<PlanSeed[] | undefined>();
  const [payFor, setPayFor] = useState<string | undefined>();
  /** se llegó desde "Iniciar atención" de la agenda: la nota clínica queda lista para escribir */
  const fromAgenda = !!params.get("atencion");

  const ql = q.trim().toLowerCase();
  const list = patients.filter((p) => !ql || `${p.name} ${p.dni} ${p.phone}`.toLowerCase().includes(ql));
  const cur = patients.find((p) => p.id === selId) ?? null;
  const showList = wide || view === "list";
  const showDetail = wide || view === "detail";
  const [mod] = modStore.useStore();
  // Cita a la que se le puede liquidar materiales desde la ficha: la que está en curso o la última atendida sin liquidar.
  const matTarget = cur ? appts.filter((a) => patientOf([cur], a) && a.t0 && !matUseOf(mod.mats, a.id)).sort((x, y) => y.date.localeCompare(x.date) || y.slot - x.slot)[0] : undefined;
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
                  {matTarget && !running && <button type="button" onClick={() => setMatsFor({ a: matTarget, finish: false })} style={{ cursor: "pointer", padding: "12px 16px", borderRadius: 12, border: 0, boxShadow: "inset 0 0 0 1.5px var(--brand-300, var(--line))", background: "transparent", color: "var(--brand-text)", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", fontFamily: "inherit" }}>Liquidar materiales</button>}
                  <Link href={`/intranet/agenda?nueva=${encodeURIComponent(cur.name)}`} style={{ padding: "12px 16px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>Nueva cita</Link>
                </div>
                {running && (
                  <AtencionBanner a={running} onAddTreatment={() => { setSeed(undefined); setModal("plan"); }} onBack={() => router.push("/intranet/agenda")} onFinish={() => setMatsFor({ a: running, finish: true })} onMaterials={matUseOf(mod.mats, running.id) ? undefined : () => setMatsFor({ a: running, finish: false })} />
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
                {tab === "anam" && <Anamnesis p={cur} onGoPlan={() => { setSeed(undefined); setModal("plan"); }} />}
                {tab === "odo" && <Odontograma p={cur} onSaved={() => setTab("hist")} />}
                {tab === "datos" && <TabDatos p={cur} />}
                {tab === "plan" && <TabPlan p={cur} plan={plans[cur.id]} onCreate={(sd) => { setSeed(sd); setModal("plan"); }} onPay={(id) => { setPayFor(id); setModal("pay"); }} />}
                {tab === "files" && <TabArchivos p={cur} />}
                {tab === "pagos" && <TabPagos p={cur} onPay={() => { setPayFor(undefined); setModal("pay"); }} />}
              </>
            )}
          </div>
        )}
      </div>

      {matsFor && <MaterialsDialog a={matsFor.a} finish={matsFor.finish} sheet={!wide} onClose={() => setMatsFor(null)} />}
      {modal === "new" && <NewPatientDialog sheet={!wide} onClose={() => setModal(null)} toastText="Paciente creado · completa la historia inicial" onCreated={(np) => { setSelId(np.id); setView("detail"); setTab("anam"); }} />}
      {modal === "plan" && cur && <PlanDialog p={cur} seed={seed} sheet={!wide} onClose={() => setModal(null)} onCreated={() => setTab("plan")} />}
      {modal === "pay" && cur && <PayDialog key={payFor ?? "libre"} p={cur} concept="" itemId={payFor} sheet={!wide} onClose={() => setModal(null)} onSaved={() => setTab(payFor ? "plan" : "pagos")} />}
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

interface PlanRow { key: number; name: string; total: string; price: string; /** el precio se calculó solo (valor por sesión × sesiones) y no se editó a mano */ auto?: boolean }

/** Crea el plan del paciente o le agrega tratamientos: cada uno con sus controles previstos y su precio total. */
function PlanDialog({ p, seed, sheet, onClose, onCreated }: { p: Patient; seed?: PlanSeed[]; sheet: boolean; onClose: () => void; onCreated: () => void }) {
  const media = useMedia();
  const existing = plansStore.get()[p.id];
  const [rows, setRows] = useState<PlanRow[]>(() => (seed?.length ? seed.map((x, k) => ({ key: k + 1, name: x.name, total: String(x.total), price: String(x.price) })) : [{ key: 1, name: "", total: "12", price: "" }]));
  const [tried, setTried] = useState(false);
  const valid = (r: PlanRow) => r.name.trim().length > 2 && parseInt(r.total, 10) > 0 && parseFloat(r.price) > 0;
  const patch = (key: number, x: Partial<PlanRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...x } : r)));
  const svOf = (name: string) => activeServices(media).find((x) => x.name === name);
  function pick(key: number, name: string) {
    // El precio del servicio es el total del tratamiento y trae su número de sesiones (cada sesión vale precio ÷ sesiones).
    const sv = svOf(name);
    patch(key, { name, ...(sv && parsePrice(sv.price) > 0 ? { price: String(parsePrice(sv.price)), total: String(serviceSessions(sv)), auto: true } : { auto: false }) });
  }
  const setTotal = (key: number, total: string) => patch(key, { total });
  function save() {
    if (!rows.every(valid)) return setTried(true);
    const items = rows.map((r): PlanItem => ({ id: uid(), name: r.name.trim(), total: parseInt(r.total, 10), done: 0, price: parseFloat(r.price), paid: 0, at: todayISO() }));
    plansStore.update((all) => ({ ...all, [p.id]: addItems(all[p.id], items) }));
    onCreated();
    onClose();
    toast(items.length > 1 ? `${items.length} tratamientos agregados (un plan de sesiones por cada uno)` : existing ? "Tratamiento agregado al plan" : "Plan creado");
  }
  const input = (ok: boolean): React.CSSProperties => ({ ...fieldStyle, height: 46, fontSize: 15, border: border(ok, tried) });
  return (
    <Frame title={existing ? "Agregar tratamientos al plan" : "Crear plan de tratamiento"} onClose={onClose} sheet={sheet}>
      {rows.map((r, k) => (
        <div key={r.key} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" }}>
          <label style={labelStyle}>Tratamiento {rows.length > 1 ? k + 1 : ""}
            <select value={activeServices(media).some((x) => x.name === r.name) ? r.name : r.name ? "__otro" : ""} onChange={(e) => (e.target.value !== "__otro" ? pick(r.key, e.target.value) : patch(r.key, { name: " ", auto: false }))} style={input(r.name.trim().length > 2)}>
              <option value="" disabled>Elige un servicio…</option>
              {activeServices(media).map((x) => <option key={x.id} value={x.name}>{x.name} · {money(parsePrice(x.price) || 0)} · {serviceSessions(x)} {serviceSessions(x) === 1 ? "sesión" : "sesiones"}</option>)}
              <option value="__otro">Otro tratamiento (escribir)</option>
            </select>
            {r.name !== "" && !activeServices(media).some((x) => x.name === r.name) && <input aria-label="Nombre del tratamiento" value={r.name.trim() === "" ? "" : r.name} onChange={(e) => patch(r.key, { name: e.target.value, auto: false })} placeholder="Nombre del tratamiento" style={{ ...input(r.name.trim().length > 2), marginTop: 6 }} />}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label style={labelStyle}>N.° de sesiones<input value={r.total} inputMode="numeric" onChange={(e) => setTotal(r.key, e.target.value)} style={input(parseInt(r.total, 10) > 0)} /></label>
            <label style={labelStyle}>Precio total (S/){parseFloat(r.price) > 0 && parseInt(r.total, 10) > 0 ? <span className="tnum" style={{ fontWeight: 400, color: "var(--ink-500)" }}> · {money(Math.round((parseFloat(r.price) / parseInt(r.total, 10)) * 100) / 100)} por sesión</span> : null}<input value={r.price} inputMode="decimal" onChange={(e) => patch(r.key, { price: e.target.value, auto: false })} style={input(parseFloat(r.price) > 0)} /></label>
          </div>
          {rows.length > 1 && <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} style={{ alignSelf: "flex-start", cursor: "pointer", background: "transparent", border: 0, color: "var(--error-fg)", fontWeight: 700, fontSize: 13, minHeight: 32, fontFamily: "inherit" }}>Quitar este tratamiento</button>}
        </div>
      ))}
      <button type="button" onClick={() => setRows((rs) => [...rs, { key: Math.max(...rs.map((x) => x.key)) + 1, name: "", total: "1", price: "" }])} style={{ ...btnOutline, alignSelf: "flex-start" }}>+ Otro tratamiento</button>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
        <button type="button" onClick={save} style={btnPrimary()}>{existing ? "Agregar al plan" : "Crear plan"}</button>
      </div>
    </Frame>
  );
}

interface PayLineState { on: boolean; amount: string }

/** Registrar pago desde la ficha: uno o varios tratamientos en un mismo cobro, asociados a una cita (un solo comprobante por cita). */
function PayDialog({ p, concept, itemId, sheet, onClose, onSaved }: { p: Patient; concept: string; itemId?: string; sheet: boolean; onClose: () => void; onSaved: () => void }) {
  const items = planItems(plansStore.get()[p.id]);
  const appts = agendaStore.get().appts.filter((a) => a.p === p.name && !["cancelada", "bloqueo", "no-show", "reprogramada"].includes(a.st)).sort((x, y) => y.date.localeCompare(x.date) || y.slot - x.slot).slice(0, 8);
  const [apptId, setApptId] = useState<string>(() => { const t = todaysApptOf(appts, p.name, todayISO()); return t ? String(t.id) : ""; });
  const suggested = (x: PlanItem) => String(Math.min(sessionPrice(x), itemBalance(x)) || "");
  const [lines, setLines] = useState<Record<string, PayLineState>>(() => {
    const o: Record<string, PayLineState> = {};
    for (const x of items) o[x.id] = { on: x.id === itemId, amount: suggested(x) };
    o.free = { on: items.length === 0 || (!itemId && concept !== ""), amount: "" };
    return o;
  });
  const [free, setFree] = useState(concept);
  const [method, setMethod] = useState<PayMethod>("Efectivo");
  const [tried, setTried] = useState(false);
  const num = (v: string) => parseFloat(v.replace(",", "."));
  const patchLine = (k: string, x: Partial<PayLineState>) => setLines((l) => ({ ...l, [k]: { ...l[k], ...x } }));
  const chosen = [...items.map((x) => ({ key: x.id, item: x as PlanItem | undefined })), { key: "free", item: undefined as PlanItem | undefined }].filter((c) => lines[c.key]?.on);
  const total = chosen.reduce((n, c) => n + (num(lines[c.key].amount) > 0 ? num(lines[c.key].amount) : 0), 0);
  const valid = chosen.length > 0 && chosen.every((c) => num(lines[c.key].amount) > 0);
  function save() {
    if (!valid) return setTried(true);
    const appt = appts.find((a) => String(a.id) === apptId);
    const payLines = chosen.map((c) => ({ concept: c.item ? c.item.name : free.trim() || "Pago", amount: num(lines[c.key].amount), ...(c.item ? { itemId: c.item.id } : {}) }));
    addPayments(payLines, { patient: p.name, method, date: appt ? apptWhenShort(appt) : todayISO(), patientId: p.id, ...(appt ? { apptId: appt.id } : {}) });
    plansStore.update((all) => {
      let plan = all[p.id];
      if (!plan) return all;
      for (const l of payLines) if (l.itemId) plan = payItem(plan, l.itemId, l.amount);
      return { ...all, [p.id]: plan };
    });
    onSaved();
    onClose();
    toast(`Pago registrado · ${money(total)}${payLines.length > 1 ? ` · ${payLines.length} tratamientos en un comprobante` : ` · ${payLines[0].concept}`}${appt ? ` · ${apptCode(appt.id)}` : ""}`);
  }
  const check = (k: string, label: React.ReactNode, hint?: string) => (
    <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 12, boxShadow: `inset 0 0 0 ${lines[k].on ? 1.5 : 1}px ${lines[k].on ? "var(--brand-200)" : "var(--line)"}` }}>
      <label style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
        <input type="checkbox" checked={lines[k].on} onChange={(e) => patchLine(k, { on: e.target.checked })} style={{ width: 20, height: 20 }} />
        <span style={{ flex: 1 }}>{label}{hint && <span style={{ display: "block", fontWeight: 400, fontSize: 12, color: "var(--ink-500)" }}>{hint}</span>}</span>
      </label>
      {lines[k].on && (
        <>
          {k === "free" && <input aria-label="Concepto" value={free} onChange={(e) => setFree(e.target.value)} placeholder="Concepto (ej. Consulta)" style={{ ...fieldStyle, height: 42, fontSize: 14 }} />}
          <input aria-label={`Monto de ${k === "free" ? "otro concepto" : items.find((x) => x.id === k)?.name}`} value={lines[k].amount} inputMode="decimal" className="tnum" onChange={(e) => patchLine(k, { amount: e.target.value })} placeholder="Monto (S/)" style={{ ...fieldStyle, height: 44, fontSize: 16, fontWeight: 700, border: border(num(lines[k].amount) > 0, tried) }} />
        </>
      )}
    </div>
  );
  return (
    <Frame title="Registrar pago" onClose={onClose} sheet={sheet}>
      <label style={labelStyle}>Cita (un comprobante por cita)
        <select value={apptId} onChange={(e) => setApptId(e.target.value)} style={{ ...fieldStyle, height: 46, fontSize: 15 }}>
          <option value="">Sin cita (comprobante propio)</option>
          {appts.map((a) => <option key={a.id} value={a.id}>{apptCode(a.id)} · {apptWhenShort(a)} · {a.s}</option>)}
        </select>
      </label>
      <div style={{ ...labelStyle, display: "flex", flexDirection: "column", gap: 8 }}>
        Tratamientos que se pagan ahora
        {items.map((x) => check(x.id, x.name, `saldo ${money(itemBalance(x))} · sesión ${money(sessionPrice(x))}`))}
        {check("free", items.length ? "Otro concepto (sin tratamiento)" : "Pago libre")}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {PAY_METHODS.map((m) => <button key={m} type="button" aria-pressed={m === method} onClick={() => setMethod(m)} style={chipStyle(m === method, { padding: "11px 14px" })}>{m}</button>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 15 }}><span>Total a cobrar</span><b className="tnum" style={{ fontSize: 20 }}>{money(total)}</b></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
        <button type="button" onClick={save} style={btnPrimary()}>Registrar pago</button>
      </div>
    </Frame>
  );
}
