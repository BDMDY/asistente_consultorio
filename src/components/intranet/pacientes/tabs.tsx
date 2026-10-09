"use client";
import Icon, { type IconName } from "@/components/ui/Icon";
import { STATUS_LABEL, hm } from "@/lib/agenda";
import { agendaStore } from "@/lib/agenda-store";
import { useDoctors } from "@/lib/doctors";
import { modStore, payInstallment } from "@/lib/mod";
import { type ClinicalNote, type PatientFile, type PlanItem, type TreatmentPlan, addNote, advance, filesStore, itemBalance, notesStore, planItems, planPaid, plansStore, removeItem, sessionPrice } from "@/lib/clinical";
import { newId } from "@/lib/ids";
import { isISODate, labelDate, labelShort, todayISO } from "@/lib/dates";
import { type Patient, patchPatient, samePatientName } from "@/lib/patients";
import { type Payment, money, paymentsStore } from "@/lib/payments";
import { useBrand } from "@/lib/brand";
import { apptCode, receiptGroup, sessionGroup } from "@/lib/receipts";
import { openSessionReceipt } from "@/lib/receipts-open";
import { toast } from "@/lib/toast";
import { useState } from "react";
import Link from "next/link";
import s from "./pac.module.css";

const payLabel = (d: string) => (isISODate(d) ? labelDate(d) : d);
const primaryBtn: React.CSSProperties = { cursor: "pointer", padding: "12px 16px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" };
const outlineBtn: React.CSSProperties = { cursor: "pointer", padding: "12px 16px", borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-text)", fontWeight: 700, fontSize: 14, background: "transparent", border: 0, fontFamily: "inherit" };

// ───────────── Historia clínica (línea de tiempo) ─────────────
export function TabHistoria({ p, autoFocus }: { p: Patient; autoFocus?: boolean }) {
  const [notes] = notesStore.useStore();
  const [payments] = paymentsStore.useStore();
  const [{ appts }] = agendaStore.useStore();
  const doctors = useDoctors();
  const [text, setText] = useState("");
  const can = text.trim().length > 2;

  const mine = appts.filter((a) => samePatientName(a.p, p.name));
  const next = mine.filter((a) => !["atendida", "cancelada", "no-show"].includes(a.st)).sort((x, y) => x.date.localeCompare(y.date) || x.slot - y.slot);
  const done = mine.filter((a) => a.st === "atendida");
  const pays = payments.filter((x) => samePatientName(x.patient, p.name));
  type Item = { ord: string; icon: IconName; t: string; d: string };
  const timeline: Item[] = [
    ...(notes[p.id] ?? []).map((n: ClinicalNote): Item => ({ ord: n.date + String(n.id).padStart(16, "0"), icon: "notebook-pen", t: n.t, d: labelDate(n.date) })),
    ...pays.map((x): Item => ({ ord: (isISODate(x.date) ? x.date : x.at.slice(0, 10)) + String(x.id).padStart(16, "0"), icon: "banknote", t: `Pago registrado · ${money(x.amount)} (${x.method})`, d: payLabel(x.date) })),
    ...done.map((a): Item => ({ ord: a.date + "0".repeat(16), icon: "stethoscope", t: `${a.s} · atendida${doctors.find((d) => d.id === a.doc) ? " · " + doctors.find((d) => d.id === a.doc)!.full : ""}`, d: labelShort(a.date) })),
  ].sort((a, b) => b.ord.localeCompare(a.ord));

  function add() {
    if (!can) return;
    addNote(p.id, text.trim(), todayISO());
    setText("");
    toast("Nota agregada");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} aria-label="Nueva nota clínica" autoFocus={autoFocus} placeholder="Agregar nota clínica (ej. control, indicaciones, dolor)" className={s.input} style={{ height: 44, fontSize: 14, flex: 1 }} />
        <button type="button" disabled={!can} onClick={add} style={{ cursor: can ? "pointer" : "not-allowed", padding: "0 18px", minHeight: 44, display: "flex", alignItems: "center", borderRadius: 12, background: can ? "var(--grad-btn)" : "var(--muted)", color: can ? "#fff" : "var(--ink-300)", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" }}>Agregar</button>
      </div>
      {timeline.map((t) => (
        <div key={t.ord + t.t} style={{ display: "flex", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--brand-50)", color: "var(--brand-text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={t.icon} size={16} /></span>
            <span style={{ flex: 1, width: 2, background: "var(--line)" }} />
          </div>
          <div style={{ paddingBottom: 14 }}>
            <b style={{ fontSize: 15 }}>{t.t}</b>
            <div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{t.d}</div>
          </div>
        </div>
      ))}
      {timeline.length === 0 && <div style={{ color: "var(--ink-500)", fontSize: 14 }}>Aún no hay registros en la historia clínica.</div>}
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Próximas citas</div>
      {next.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "8px 0", borderTop: "1px solid var(--line)" }}>
          <span className="tnum"><b>{labelShort(c.date)} {hm(c.slot)}</b> · {c.s}</span>
          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--st-${c.st}-bg)`, color: `var(--st-${c.st}-fg)` }}>{STATUS_LABEL[c.st]}</span>
        </div>
      ))}
      {next.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-500)" }}>Sin citas próximas</span>}
    </>
  );
}

// ───────────── Datos ─────────────
export function TabDatos({ p }: { p: Patient }) {
  const field = (label: string, value: string, set: (v: string) => void) => (
    <label key={label} className={s.field}>{label}<input value={value} onChange={(e) => set(e.target.value)} className={s.input} style={{ height: 46, fontSize: 15, borderRadius: 12, padding: "0 14px" }} /></label>
  );
  return (
    <>
      <div className={s.g2}>
        {field("Nombre completo", p.name, (v) => patchPatient(p.id, { name: v }))}
        {field("DNI", p.dni, (v) => patchPatient(p.id, { dni: v.replace(/\D/g, "").slice(0, 8) }))}
        {field("Celular", p.phone, (v) => patchPatient(p.id, { phone: v }))}
        {field("Correo", p.email ?? "", (v) => patchPatient(p.id, { email: v }))}
        {field("Alertas médicas", p.alerts.join(", "), (v) => patchPatient(p.id, { alerts: v.split(",").map((x) => x.trim()).filter(Boolean) }))}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Las alertas se separan con comas. Los cambios se guardan automáticamente.</div>
    </>
  );
}

// ───────────── Plan de tratamiento ─────────────
export interface PlanSeed { name: string; total: number; price: number }

/** Plan de tratamiento del paciente: un plan de sesiones por cada servicio o tratamiento (con su avance y sus pagos), y los planes de pago en cuotas anteriores. */
export function TabPlan({ p, plan, onCreate, onPay }: { p: Patient; plan: TreatmentPlan | undefined; onCreate: (seed?: PlanSeed[]) => void; onPay: (itemId?: string) => void }) {
  const [mod] = modStore.useStore();
  const mine = mod.planes.filter((x) => x.pac.toLowerCase() === p.name.toLowerCase());
  const items = planItems(plan);
  const pct = plan ? Math.min(100, Math.round((plan.done / Math.max(1, plan.total)) * 100)) : 0;
  function session(it: PlanItem) {
    if (it.done >= it.total) return toast(`${it.name} ya tiene todas sus sesiones`);
    plansStore.update((all) => ({ ...all, [p.id]: advance(all[p.id], [it.id]) }));
    toast(`Sesión registrada · ${it.name} ${it.done + 1} de ${it.total}`);
  }
  function remove(it: PlanItem) {
    const prev = plansStore.get()[p.id];
    plansStore.update((all) => { const next = removeItem(all[p.id], it.id); const out = { ...all }; if (next) out[p.id] = next; else delete out[p.id]; return out; });
    toast(`${it.name} quitado del plan`, () => plansStore.update((all) => ({ ...all, [p.id]: prev })));
  }
  const bar = (v: number, tone: "main" | "pay" = "main") => (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} style={{ height: 8, borderRadius: 4, background: "var(--brand-100)" }}><div style={{ width: `${v}%`, height: "100%", borderRadius: 4, background: tone === "pay" ? "var(--accent-500)" : "var(--grad-btn)" }} /></div>
  );
  const card: React.CSSProperties = { borderRadius: 16, boxShadow: "inset 0 0 0 1px var(--line)", padding: 20, display: "flex", flexDirection: "column", gap: 12 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {plan ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <b style={{ fontSize: 18 }}>{items.length === 1 ? "1 tratamiento" : `${items.length} tratamientos`}</b>
              <div className="tnum" style={{ fontSize: 13, color: "var(--ink-500)" }}>Sesiones {plan.done} de {plan.total} ({pct}%) · pagado {money(planPaid(plan))} de {money(plan.price)}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => onCreate()} style={primaryBtn}>+ Agregar tratamiento</button>
              <Link href={`/intranet/agenda?nueva=${encodeURIComponent(p.name)}&serie=1`} style={{ ...outlineBtn, display: "flex", alignItems: "center" }}>Agendar sesiones en serie</Link>
            </div>
          </div>
          {items.map((it) => {
            const v = Math.min(100, Math.round((it.done / Math.max(1, it.total)) * 100));
            const pv = Math.min(100, Math.round(((it.paid ?? 0) / Math.max(1, it.price)) * 100));
            const complete = it.done >= it.total;
            return (
              <div key={it.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                  <b style={{ fontSize: 17 }}>{it.name}</b>
                  <span style={{ padding: "3px 10px", borderRadius: 999, background: complete ? "var(--success-bg)" : "var(--info-bg)", color: complete ? "var(--success-fg)" : "var(--info-fg)", fontSize: 12, fontWeight: 700 }}>{complete ? "Sesiones completas" : "En curso"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--ink-500)" }}><span>Sesiones</span><b className="tnum" style={{ color: "var(--ink-900)" }}>{it.done} de {it.total} · {v}%</b></div>
                {bar(v)}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--ink-500)" }}><span>Pagado</span><b className="tnum" style={{ color: "var(--ink-900)" }}>{money(it.paid ?? 0)} de {money(it.price)} · saldo {money(itemBalance(it))}</b></div>
                {bar(pv, "pay")}
                <div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{money(sessionPrice(it))} por sesión{it.at ? ` · agregado el ${labelShort(it.at)}` : ""}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => session(it)} disabled={complete} style={{ ...primaryBtn, opacity: complete ? 0.5 : 1 }}>Registrar sesión {Math.min(it.total, it.done + 1)}</button>
                  <button type="button" onClick={() => onPay(it.id)} style={outlineBtn}>Registrar pago</button>
                  <button type="button" onClick={() => remove(it)} style={{ ...outlineBtn, color: "var(--error-fg)" }}>Quitar</button>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ padding: 24, borderRadius: 16, border: "1.5px dashed var(--brand-200)", textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <b>Sin plan de tratamiento</b>
          <span style={{ fontSize: 14, color: "var(--ink-500)", lineHeight: 1.5 }}>Cada servicio o tratamiento tiene su propio plan de sesiones. Crea el primero y agrega más cuando la evaluación odontológica lo indique, incluso durante una sesión.</span>
          <button type="button" onClick={() => onCreate()} style={primaryBtn}>Crear plan</button>
        </div>
      )}

      {mine.map((m) => {
        const v = Math.min(100, Math.round((m.paid / Math.max(1, m.n)) * 100));
        const done = m.paid >= m.n;
        return (
          <div key={m.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <b style={{ fontSize: 17 }}>{m.trat}</b>
              <span style={{ padding: "3px 10px", borderRadius: 999, background: "var(--warning-bg)", color: "var(--warning-fg)", fontSize: 12, fontWeight: 700 }}>Plan de pago en cuotas</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--ink-500)" }}><span>Cuotas pagadas</span><b className="tnum" style={{ color: "var(--ink-900)" }}>{m.paid} de {m.n} · {v}%</b></div>
            {bar(v, "pay")}
            <div className="tnum" style={{ fontSize: 14, color: "var(--ink-500)" }}>{money(m.cuota)} por cuota · saldo {money((m.n - m.paid) * m.cuota)}{m.disc ? ` · descuento ${m.disc.label}` : ""}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={done} onClick={() => payInstallment(m.id)} style={{ ...primaryBtn, opacity: done ? 0.5 : 1 }}>{done ? "Plan pagado" : `Registrar cuota ${m.paid + 1} (${money(m.cuota)})`}</button>
              <button type="button" onClick={() => onCreate((m.svcs ?? [m.trat]).map((name) => ({ name, total: Math.max(1, Math.ceil(m.n / (m.svcs?.length || 1))), price: Math.round(((m.n * m.cuota) / (m.svcs?.length || 1)) * 100) / 100 })))} style={outlineBtn}>Crear un plan de sesiones por servicio</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────── Archivos ─────────────
export function TabArchivos({ p }: { p: Patient }) {
  const [files] = filesStore.useStore();
  const list: PatientFile[] = files[p.id] ?? [];
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const kb = f.size / 1024;
    const item: PatientFile = { id: newId(), n: f.name, s: kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.round(kb) + " KB", date: todayISO() };
    filesStore.update((all) => ({ ...all, [p.id]: [...(all[p.id] ?? []), item] }));
    toast("Archivo agregado");
  }
  return (
    <>
      <label style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 64, borderRadius: 14, border: "1.5px dashed var(--brand-300)", color: "var(--brand-text)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        <input type="file" onChange={onFile} aria-label="Subir archivo" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
        <Icon name="upload" />Subir radiografía, foto o documento
      </label>
      {list.map((f) => (
        <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" }}>
          <Icon name="file-image" style={{ color: "var(--brand-600)" }} />
          <div style={{ flex: 1, fontSize: 14, minWidth: 0 }}><b>{f.n}</b><div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{f.s} · {labelDate(f.date)}</div></div>
          <button type="button" aria-label={`Quitar ${f.n}`} onClick={() => filesStore.update((all) => ({ ...all, [p.id]: (all[p.id] ?? []).filter((x) => x.id !== f.id) }))} style={{ cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--error-fg)", background: "transparent", border: 0 }}><Icon name="trash-2" /></button>
        </div>
      ))}
      {list.length === 0 && <div style={{ color: "var(--ink-500)", fontSize: 14 }}>Sin archivos todavía.</div>}
      <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Modo demo: se registra el nombre y el tamaño. El archivo se guardará en almacenamiento privado al conectar Supabase.</div>
    </>
  );
}

// ───────────── Pagos ─────────────
export function TabPagos({ p, onPay }: { p: Patient; onPay: () => void }) {
  const [payments] = paymentsStore.useStore();
  const [{ appts }] = agendaStore.useStore();
  const brand = useBrand();
  const doctors = useDoctors();
  const pays = payments.filter((x) => samePatientName(x.patient, p.name));
  // Un comprobante por cita: los tratamientos pagados en la misma cita van juntos, con su total.
  const byNo = new Map<string, Payment[]>();
  for (const x of pays.slice().reverse()) byNo.set(x.no, [...(byNo.get(x.no) ?? []), x]);
  const open = (l: Payment[]) => {
    const f = l[0];
    const g = f.apptId ? sessionGroup(f.apptId, payments, appts) : receiptGroup(f.no, payments);
    const doc = g.appt ? doctors.find((d) => d.id === g.appt!.doc)?.full : undefined;
    if (!openSessionReceipt(g, { clinic: brand.name, doctor: doc })) toast("Permite ventanas emergentes para ver el comprobante");
  };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <b className="tnum" style={{ fontSize: 18 }}>Total pagado {money(pays.filter((x) => !x.voided).reduce((t, x) => t + x.amount, 0))}</b>
        <button type="button" onClick={onPay} style={primaryBtn}>Registrar pago</button>
      </div>
      {[...byNo.values()].map((l) => {
        const f = l[0], live = l.filter((x) => !x.voided), total = live.reduce((n, x) => n + x.amount, 0);
        return (
          <div key={f.no} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Icon name="banknote" style={{ color: "var(--brand-600)" }} />
              <div style={{ flex: 1, fontSize: 14 }}><b>Comprobante {f.no}</b><div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{f.apptId ? `${apptCode(f.apptId)} · ` : ""}{payLabel(f.date)} · {[...new Set(l.map((x) => x.method))].join(" + ")}</div></div>
              <b className="tnum" style={live.length === 0 ? { textDecoration: "line-through", color: "var(--ink-500)" } : undefined}>{live.length === 0 ? "Anulado · " : ""}{money(live.length ? total : l.reduce((n, x) => n + x.amount, 0))}</b>
            </div>
            {l.map((x) => (
              <div key={x.id} className="tnum" style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13, color: "var(--ink-500)", paddingLeft: 36, textDecoration: x.voided ? "line-through" : undefined }}>
                <span>{x.concept}</span><span>{money(x.amount)}</span>
              </div>
            ))}
            {live.length > 0 && <button type="button" onClick={() => open(l)} style={{ alignSelf: "flex-start", marginLeft: 36, cursor: "pointer", background: "transparent", border: 0, color: "var(--brand-text)", fontWeight: 700, fontSize: 13, minHeight: 32, fontFamily: "inherit" }}>Ver comprobante de la cita</button>}
          </div>
        );
      })}
      {pays.length === 0 && <div style={{ color: "var(--ink-500)", fontSize: 14 }}>Sin pagos registrados.</div>}
    </>
  );
}
