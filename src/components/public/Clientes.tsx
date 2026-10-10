"use client";
import Link from "next/link";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/ui/Icon";
import { STATUS_LABEL } from "@/lib/agenda";
import { limaHM } from "@/lib/attention";
import { RATE_LIMITED, lookupPortal } from "@/lib/backend/public-api";
import { useBrand } from "@/lib/brand";
import { labelLong, todayISO } from "@/lib/dates";
import { useDoctors } from "@/lib/doctors";
import { money } from "@/lib/payments";
import { type PortalData, type PortalPay, type TimelineGroup, asPayment, buildTimeline, receiptsOf } from "@/lib/portal";
import { sessionGroup, receiptGroup } from "@/lib/receipts";
import { openSessionReceipt } from "@/lib/receipts-open";
import type { Appt } from "@/lib/agenda";

const field: React.CSSProperties = { height: 50, borderRadius: 12, border: "1px solid var(--line)", padding: "0 14px", fontSize: 16, background: "var(--surface)", color: "inherit", width: "100%", boxSizing: "border-box" };
const card: React.CSSProperties = { background: "var(--surface)", padding: 18, borderRadius: 16, boxShadow: "var(--shadow-md)" };
const VIEWS = ["Todo", "Citas", "Comprobantes", "Diagnósticos y resultados"] as const;
type View = (typeof VIEWS)[number];
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** Portal de clientes: el paciente entra con su DNI y teléfono y ve su historial cronológico de citas, comprobantes y resultados. */
export default function Clientes() {
  const docs = useDoctors();
  const brand = useBrand();
  const [f, setF] = useState({ dni: "", phone: "", birth: "" });
  const [creds, setCreds] = useState<{ dni: string; phone: string } | null>(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [none, setNone] = useState(false);
  const [view, setView] = useState<View>("Todo");
  const [desc, setDesc] = useState(true);
  const [birthTried, setBirthTried] = useState(false);

  const okDni = /^\d{8}$/.test(f.dni);
  const okPhone = f.phone.replace(/\D/g, "").length >= 9;

  async function load(dni: string, phone: string, birth?: string) {
    setBusy(true);
    setError("");
    try {
      const r = await lookupPortal(dni, phone, birth);
      setNone(!r);
      setData(r);
      if (r) setCreds({ dni, phone });
    } catch (e) {
      setError(e instanceof Error && e.message === RATE_LIMITED ? "Demasiados intentos con esos datos. Por seguridad, espera 15 minutos antes de volver a intentar o llama a la clínica." : "No pudimos consultar tus datos. Intenta de nuevo en unos minutos.");
    }
    setBusy(false);
  }
  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!okDni || !okPhone) return;
    await load(f.dni, f.phone);
  }
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBirthTried(true);
    if (!creds || !f.birth) return;
    await load(creds.dni, creds.phone, f.birth);
  }
  const leave = () => { setData(null); setCreds(null); setF({ dni: "", phone: "", birth: "" }); setTried(false); setBirthTried(false); setView("Todo"); };

  const docName = (id: number) => docs.find((d) => d.id === id)?.name ?? "";
  const bd = (ok: boolean) => (tried && !ok ? "2px solid var(--error-fg)" : "1px solid var(--line)");

  function printReceipt(pays: PortalPay[]) {
    if (!data) return;
    const first = pays[0];
    const all = data.payments.map((p) => asPayment(p, data.name));
    const a = first.apptId !== undefined ? data.appts.find((x) => x.id === first.apptId) : undefined;
    const appt: Appt | undefined = a ? { id: a.id, date: a.date, slot: a.slot, dur: a.dur, p: data.name, s: a.service, st: a.status, doc: a.doc } : undefined;
    const g = first.apptId !== undefined ? sessionGroup(first.apptId, all, appt ? [appt] : []) : receiptGroup(first.no, all);
    openSessionReceipt(g, { clinic: brand.name, doctor: a ? docName(a.doc) : undefined });
  }

  const receiptCard = (pays: PortalPay[], key: string) => {
    const total = pays.reduce((n, p) => n + p.amount, 0);
    return (
      <div key={key} style={{ borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
          <b className="tnum" style={{ fontSize: 14 }}>Comprobante {pays[0].no}</b>
          <b className="tnum">{money(total)}</b>
        </div>
        <div className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>{cap(labelLong(todayISO(new Date(pays[0].at))))} · {limaHM(pays[0].at)} · {[...new Set(pays.map((p) => p.method))].join(" + ")}</div>
        {pays.map((p) => <div key={p.id} className="tnum" style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{p.concept}</span><span>{money(p.amount)}</span></div>)}
        <button type="button" onClick={() => printReceipt(pays)} style={{ alignSelf: "flex-start", cursor: "pointer", background: "transparent", border: 0, padding: 0, minHeight: 32, color: "var(--brand-text)", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>Ver / imprimir comprobante</button>
      </div>
    );
  };

  const stamp = (g: { date: string; time: string }) => <span className="tnum" style={{ color: "var(--ink-500)", fontSize: 13 }}>{cap(labelLong(g.date))}{g.time ? ` · ${g.time}` : ""}</span>;

  const groupView = (g: TimelineGroup) => (
    <li key={g.key} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
      {g.kind === "cita" && g.appt && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <b>{g.appt.service}</b>
            {stamp(g)}
            <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{docName(g.appt.doc)}</span>
          </span>
          <span style={{ padding: "4px 10px", borderRadius: 999, background: `var(--st-${g.appt.status}-bg)`, color: `var(--st-${g.appt.status}-fg)`, fontSize: 12, fontWeight: 700 }}>{STATUS_LABEL[g.appt.status]}</span>
          {["pendiente", "confirmada"].includes(g.appt.status) && g.appt.date >= todayISO() && <Link href={`/mi-cita/${g.appt.ref}`} style={{ color: "var(--brand-text)", fontWeight: 700, fontSize: 13 }}>Gestionar</Link>}
        </div>
      )}
      {g.kind === "comprobante" && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b>Pago</b>{stamp(g)}</div>}
      {g.kind === "nota" && <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><b>Atención registrada</b>{stamp(g)}</div>}
      {receiptsOf(g.pays).map((r) => receiptCard(r, g.key + r[0].no))}
      {g.notes.map((n) => (
        <div key={n.id} style={{ borderRadius: 12, background: "var(--brand-50)", padding: 12, fontSize: 14, lineHeight: 1.5 }}>
          <b style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "var(--brand-800)" }}><Icon name="stethoscope" size={14} />Diagnóstico / resultado</b>
          {n.text}
        </div>
      ))}
    </li>
  );

  const timeline = data ? buildTimeline(data, desc) : [];
  const upcoming = data ? data.appts.filter((a) => a.date >= todayISO() && ["pendiente", "confirmada"].includes(a.status)) : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--grad-hero)" }}>
      <div style={{ padding: "14px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/" style={{ flex: 1, color: "inherit" }} aria-label="Ir al sitio"><BrandMark size="sm" /></Link>
        <ThemeToggle style={{ margin: "-6px -10px -6px 0" }} />
      </div>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 18 }}>
        {!data && (
          <>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Clientes</h1>
              <p style={{ color: "var(--ink-500)", margin: "6px 0 0", lineHeight: 1.5 }}>Consulta tu historial de citas, tus comprobantes de pago y los resultados de tus atenciones. Ingresa el DNI y el teléfono que registraste en la clínica.</p>
            </div>
            <form onSubmit={enter} noValidate style={{ ...card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>DNI
                <input inputMode="numeric" maxLength={8} autoComplete="off" value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, "") })} style={{ ...field, border: bd(okDni) }} />
                {tried && !okDni && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13 }}>El DNI tiene 8 dígitos</span>}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Teléfono
                <input type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ ...field, border: bd(okPhone) }} />
                {tried && !okPhone && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13 }}>Ingresa tu número de 9 dígitos</span>}
              </label>
              {error && <div role="alert" style={{ color: "var(--error-fg)", fontWeight: 600, fontSize: 14 }}>{error}</div>}
              <button type="submit" disabled={busy} style={{ cursor: "pointer", minHeight: 50, borderRadius: 12, border: 0, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 16, opacity: busy ? 0.7 : 1, fontFamily: "inherit" }}>{busy ? "Buscando…" : "Entrar"}</button>
            </form>
            {none && (
              <div role="status" style={{ ...card, lineHeight: 1.5 }}>
                <b>No encontramos registros con esos datos.</b>
                <div style={{ color: "var(--ink-500)", fontSize: 14, marginTop: 4 }}>Revisa que sean los mismos que diste en la clínica o <Link href="/reserva" style={{ color: "var(--brand-text)", fontWeight: 600 }}>reserva una cita</Link>.</div>
              </div>
            )}
            <p style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5, margin: 0 }}>Tus datos de salud son personales: solo se muestran con tu DNI y teléfono, y los diagnósticos con tu fecha de nacimiento. <Link href="/privacidad" style={{ color: "var(--brand-text)", fontWeight: 600 }}>Aviso de privacidad</Link></p>
          </>
        )}

        {data && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Hola, {data.name.split(" ")[0]}</h1>
                <span style={{ color: "var(--ink-500)", fontSize: 14 }}>{upcoming.length ? `Tienes ${upcoming.length} ${upcoming.length === 1 ? "cita próxima" : "citas próximas"}` : "No tienes citas próximas"} · <Link href="/reserva" style={{ color: "var(--brand-text)", fontWeight: 600 }}>Reservar</Link></span>
              </div>
              <button type="button" onClick={leave} style={{ cursor: "pointer", minHeight: 44, padding: "0 14px", borderRadius: 12, border: 0, boxShadow: "inset 0 0 0 1px var(--line)", background: "var(--surface)", color: "var(--ink-700)", fontWeight: 600, fontFamily: "inherit" }}>Salir</button>
            </div>

            {!data.verified && (
              <form onSubmit={unlock} style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <b style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="shield-check" size={18} />Diagnósticos y resultados</b>
                {data.hasBirth ? (
                  <>
                    <span style={{ fontSize: 14, color: "var(--ink-500)", lineHeight: 1.5 }}>Por tu seguridad, confirma tu fecha de nacimiento para ver tus diagnósticos y tratamientos.</span>
                    <input type="date" aria-label="Fecha de nacimiento" value={f.birth} onChange={(e) => setF({ ...f, birth: e.target.value })} style={{ ...field, border: birthTried && !f.birth ? "2px solid var(--error-fg)" : "1px solid var(--line)" }} />
                    {birthTried && creds && f.birth && !busy && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13 }}>La fecha no coincide con la registrada en la clínica.</span>}
                    {error && <div role="alert" style={{ color: "var(--error-fg)", fontWeight: 600, fontSize: 14 }}>{error}</div>}
                    <button type="submit" disabled={busy} style={{ cursor: "pointer", minHeight: 46, borderRadius: 12, border: 0, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontFamily: "inherit" }}>Ver mis resultados</button>
                  </>
                ) : (
                  <span style={{ fontSize: 14, color: "var(--ink-500)", lineHeight: 1.5 }}>Aún no tenemos tu fecha de nacimiento registrada. Pídela en recepción en tu próxima visita para ver tus diagnósticos aquí.</span>
                )}
              </form>
            )}

            {data.verified && data.plan.length > 0 && (
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <b>Mis tratamientos</b>
                {data.plan.map((it) => (
                  <div key={it.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div className="tnum" style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>{it.name}</span><b>{it.done} de {it.total} {it.total === 1 ? "sesión" : "sesiones"}</b></div>
                    <div role="progressbar" aria-valuenow={Math.round((it.done / Math.max(1, it.total)) * 100)} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, borderRadius: 99, background: "var(--muted)", overflow: "hidden" }}><div style={{ width: `${Math.round((it.done / Math.max(1, it.total)) * 100)}%`, height: "100%", background: "var(--grad-btn)" }} /></div>
                    <span className="tnum" style={{ fontSize: 12, color: "var(--ink-500)" }}>Pagado {money(it.paid ?? 0)} de {money(it.price)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="tablist">
              {VIEWS.map((v) => <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} style={{ cursor: "pointer", minHeight: 40, padding: "0 14px", borderRadius: 999, border: 0, fontWeight: 700, fontSize: 13, fontFamily: "inherit", background: view === v ? "var(--brand-800)" : "var(--surface)", color: view === v ? "#fff" : "var(--ink-700)", boxShadow: view === v ? "none" : "inset 0 0 0 1px var(--line)" }}>{v}</button>)}
              <span style={{ flex: 1 }} />
              <button type="button" onClick={() => setDesc(!desc)} style={{ cursor: "pointer", minHeight: 40, padding: "0 12px", borderRadius: 10, border: 0, background: "transparent", color: "var(--brand-text)", fontWeight: 700, fontSize: 13, fontFamily: "inherit" }}>{desc ? "Más recientes primero ↓" : "Más antiguos primero ↑"}</button>
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }} aria-label={view}>
              {view === "Todo" && timeline.map(groupView)}
              {view === "Citas" && timeline.filter((g) => g.kind === "cita").map((g) => groupView({ ...g, pays: [], notes: [] }))}
              {view === "Comprobantes" && (() => {
                const rs = receiptsOf(data.payments).sort((a, b) => (desc ? b[0].at.localeCompare(a[0].at) : a[0].at.localeCompare(b[0].at)));
                return rs.map((r) => <li key={r[0].no} style={card}>{receiptCard(r, r[0].no)}</li>);
              })()}
              {view === "Diagnósticos y resultados" && !data.verified && <li style={{ ...card, color: "var(--ink-500)", fontSize: 14 }}>Confirma tu fecha de nacimiento arriba para ver tus diagnósticos y resultados.</li>}
              {view === "Diagnósticos y resultados" && data.verified && data.notes.slice().sort((a, b) => (`${a.date}${a.at ?? ""}`).localeCompare(`${b.date}${b.at ?? ""}`) * (desc ? -1 : 1)).map((n) => groupView({ key: "n" + n.id, date: n.date, time: n.at ? limaHM(n.at) : "", kind: "nota", pays: [], notes: [n] }))}
            </ul>
            {((view === "Todo" && timeline.length === 0) || (view === "Citas" && data.appts.length === 0) || (view === "Comprobantes" && data.payments.length === 0) || (view === "Diagnósticos y resultados" && data.verified && data.notes.length === 0)) && (
              <div role="status" style={{ ...card, color: "var(--ink-500)", fontSize: 14 }}>Aún no hay registros en esta sección.</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
