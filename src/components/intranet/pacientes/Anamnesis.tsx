"use client";
import Link from "next/link";
import { type ReactNode } from "react";
import { type Anamnesis as AnamData, HABITOS, RISKS, SUFRE, TXT_ACLAR, TXT_CIERRE, TXT_EGEN, TXT_ESTO, TXT_INICIO, VITALES, type YNQ, type TXTQ, addNote, anamProgress, anamnesisStore, derivedAlerts, emptyAnam, patchAnam } from "@/lib/clinical";
import { todayISO } from "@/lib/dates";
import { doctorsOf, useMedia } from "@/lib/media";
import { type Patient, patchPatient } from "@/lib/patients";
import { toast } from "@/lib/toast";
import s from "./pac.module.css";

const NAV: [string, string][] = [["Ingreso", "ingreso"], ["Filiación", "filiacion"], ["Riesgos", "riesgos"], ["Sufre de", "sufre"], ["Hábitos", "habitos"], ["Examen general", "egen"], ["Estomatológico", "esto"], ["Plan", "cierre"]];

function ageFrom(iso: string, today: string): string {
  const b = Date.parse(iso), t = Date.parse(today);
  return Number.isFinite(b) && Number.isFinite(t) ? String(Math.max(0, Math.floor((t - b) / 31557600000))) : "";
}

export function Anamnesis({ p, onGoPlan }: { p: Patient; onGoPlan: () => void }) {
  const media = useMedia();
  const [all] = anamnesisStore.useStore();
  const a: AnamData = all[p.id] ?? emptyAnam();
  const docs = doctorsOf(media);
  const today = todayISO();
  const { pct, missing } = anamProgress(a);
  const derived = derivedAlerts(a);
  const docId = a.v.doc ?? String(docs[0].id);

  const setV = (k: string, v: string) => patchAnam(p.id, { v: { ...a.v, [k]: v } });
  const setYN = (k: string, v: "si" | "no") => {
    const yn = { ...a.yn };
    if (yn[k] === v) delete yn[k];
    else yn[k] = v;
    patchAnam(p.id, { yn });
  };

  function complete() {
    if (a.done) {
      patchAnam(p.id, { done: false });
      return toast("Historia inicial reabierta");
    }
    if (!(a.v.motivo ?? "").trim()) return toast("Indica al menos el motivo de consulta");
    const doc = docs.find((d) => String(d.id) === docId)?.name ?? "Odontólogo tratante";
    addNote(p.id, `Historia clínica inicial completada · ${doc} · ${pct}% del cuestionario`, today);
    patchAnam(p.id, { done: true });
    toast("Historia clínica inicial completada");
  }

  const text = (q: TXTQ) => (
    <label key={q[0]} className={s.field}>{q[1]}
      <textarea rows={q[2]} value={a.v[q[0]] ?? ""} onChange={(e) => setV(q[0], e.target.value)} className={s.area} />
    </label>
  );
  const yn = (q: YNQ) => {
    const [k, label, ph] = q, on = a.yn[k];
    const btn = (v: "si" | "no") => {
      const sel = on === v, si = v === "si";
      return (
        <button type="button" aria-pressed={sel} aria-label={`${si ? "Sí" : "No"}: ${label}`} onClick={() => setYN(k, v)}
          style={{ cursor: "pointer", minWidth: 54, minHeight: 38, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, fontWeight: 700, fontSize: 13, fontFamily: "inherit", border: 0,
            background: sel ? (si ? "var(--warning-bg)" : "var(--success-bg)") : "var(--surface)", color: sel ? (si ? "var(--warning-fg)" : "var(--success-fg)") : "var(--ink-500)",
            boxShadow: sel ? `inset 0 0 0 2px ${si ? "var(--warning-fg)" : "var(--success-fg)"}` : "inset 0 0 0 1px var(--line)" }}>{si ? "Sí" : "No"}</button>
      );
    };
    return (
      <div key={k} className={s.yn}>
        <span className={s.ynQ}>{label}</span>
        {ph && <input value={a.v["x_" + k] ?? ""} onChange={(e) => setV("x_" + k, e.target.value)} placeholder={ph} aria-label={ph} style={{ width: 150, height: 36, borderRadius: 8, border: "1px solid var(--line)", padding: "0 8px", fontSize: 13, background: "var(--surface)", color: "inherit" }} />}
        {btn("si")}{btn("no")}
      </div>
    );
  };
  const card = (id: string, title: string | null, children: ReactNode) => (
    <div className={s.card}>{title && <h3 className={s.cardT} id={`an-${id}`}>{title}</h3>}{children}</div>
  );
  const input = (label: string, value: string, set: (v: string) => void, opts: { type?: string; span?: boolean; mode?: "numeric" } = {}) => (
    <label key={label} className={`${s.field} ${opts.span ? s.span2 : ""}`}>{label}
      <input type={opts.type ?? "text"} value={value} onChange={(e) => set(e.target.value)} className={s.input} inputMode={opts.mode} />
    </label>
  );
  const jump = (id: string) => document.getElementById("an-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, background: "var(--brand-50)", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: 16 }}>Historia clínica · atención inicial</b>
          <div style={{ height: 8, borderRadius: 4, background: "var(--brand-100)" }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: "var(--grad-accent)" }} /></div>
          <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{pct}% completa · se guarda sola y puedes seguir actualizándola en cada visita{a.at ? " · guardado" : ""}</span>
          {missing && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--warning-fg)" }}>{missing}</span>}
          <div style={{ display: "flex", gap: 6, overflow: "auto", paddingTop: 4 }}>
            {NAV.map(([t, id]) => <button key={id} type="button" onClick={() => jump(id)} style={{ cursor: "pointer", whiteSpace: "nowrap", minHeight: 36, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 999, background: "var(--surface)", boxShadow: "inset 0 0 0 1px var(--brand-200)", fontSize: 12, fontWeight: 700, color: "var(--brand-700)", border: 0, fontFamily: "inherit" }}>{t}</button>)}
          </div>
        </div>
        <button type="button" onClick={complete} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 18px", borderRadius: 12, fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit",
          background: a.done ? "var(--success-bg)" : "var(--grad-btn)", color: a.done ? "var(--success-fg)" : "#fff", boxShadow: a.done ? "inset 0 0 0 1.5px var(--success-fg)" : "none" }}>{a.done ? "Completada ✓ · Reabrir" : "Marcar como completada"}</button>
      </div>

      {card("ingreso", "DATOS DE INGRESO",
        <div className={s.g3}>
          <label className={s.field}>Odontólogo tratante
            <select value={docId} onChange={(e) => setV("doc", e.target.value)} className={s.input}>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          </label>
          {input("Emp. aseguradora", a.v.aseg ?? "", (v) => setV("aseg", v))}
          {input("Fecha de ingreso", a.v.fecha ?? today, (v) => setV("fecha", v), { type: "date" })}
        </div>)}

      {card("filiacion", "FILIACIÓN",
        <>
          <div className={s.g2}>
            {input("Nombre y apellido", p.name, (v) => patchPatient(p.id, { name: v }), { span: true })}
            {input("Edad (años)", a.v.fnac ? ageFrom(a.v.fnac, today) : (a.v.edad ?? ""), (v) => setV("edad", v), { mode: "numeric" })}
            {input("Dirección", a.v.dir ?? "", (v) => setV("dir", v), { span: true })}
            {input("DNI", p.dni, (v) => patchPatient(p.id, { dni: v.replace(/\D/g, "").slice(0, 8) }), { mode: "numeric" })}
            {input("Lugar de nacimiento", a.v.lugar ?? "", (v) => setV("lugar", v))}
            {input("Fecha de nacimiento", a.v.fnac ?? "", (v) => setV("fnac", v), { type: "date" })}
            {input("Teléfono", a.v.telf ?? "", (v) => setV("telf", v))}
            {input("Celular", p.phone, (v) => patchPatient(p.id, { phone: v }))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Sexo</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([["Masculino", "M"], ["Femenino", "F"]] as const).map(([t, v]) => (
              <button key={v} type="button" aria-pressed={a.v.sexo === v} onClick={() => setV("sexo", v)} style={{ cursor: "pointer", minHeight: 44, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit", background: a.v.sexo === v ? "var(--grad-btn)" : "var(--surface)", color: a.v.sexo === v ? "#fff" : "var(--ink-900)", boxShadow: a.v.sexo === v ? "none" : "inset 0 0 0 1px var(--line)" }}>{t}</button>
            ))}
          </div>
        </>)}

      {card("inicio", null, TXT_INICIO.map(text))}
      {card("riesgos", "RIESGOS", RISKS.map(yn))}
      {card("sufre", "SUFRE O HA SUFRIDO DE", SUFRE.map(yn))}
      {card("habitos", "HÁBITOS", <>{HABITOS.map(yn)}{TXT_ACLAR.map(text)}</>)}

      {derived.length > 0 && (
        <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--error-bg)", display: "flex", flexDirection: "column", gap: 10 }}>
          <b style={{ color: "var(--error-fg)", fontSize: 14 }}>Alertas detectadas en el cuestionario</b>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{derived.map((x) => <span key={x} style={{ padding: "6px 11px", borderRadius: 999, background: "var(--surface)", color: "var(--error-fg)", fontSize: 12, fontWeight: 700 }}>{x}</span>)}</div>
          <button type="button" onClick={() => { const cur = [...p.alerts]; derived.forEach((x) => !cur.includes(x) && cur.push(x)); patchPatient(p.id, { alerts: cur }); toast("Alertas aplicadas a la ficha"); }} style={{ cursor: "pointer", alignSelf: "flex-start", minHeight: 42, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 10, background: "var(--error-fg)", color: "#fff", fontWeight: 700, fontSize: 13, border: 0, fontFamily: "inherit" }}>Aplicar a las alertas de la ficha</button>
        </div>
      )}

      {card("egen", "EXAMEN CLÍNICO GENERAL",
        <>
          {TXT_EGEN.map(text)}
          <div style={{ fontSize: 12, fontWeight: 700 }}>3. Funciones vitales</div>
          <div className={s.g4}>{VITALES.map(([k, l]) => input(l, a.v["v_" + k] ?? "", (v) => setV("v_" + k, v)))}</div>
        </>)}
      {card("esto", "EXAMEN CLÍNICO ESTOMATOLÓGICO", <div className={s.g2}>{TXT_ESTO.map(text)}</div>)}
      {card("cierre", "OBSERVACIONES Y PLAN",
        <>
          {TXT_CIERRE.map(text)}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onGoPlan} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" }}>Crear plan de tratamiento</button>
            <Link href={`/intranet/agenda?nueva=${encodeURIComponent(p.name)}`} style={{ minHeight: 44, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-700)", fontWeight: 700, fontSize: 14 }}>Agendar siguiente cita</Link>
          </div>
        </>)}
    </>
  );
}
