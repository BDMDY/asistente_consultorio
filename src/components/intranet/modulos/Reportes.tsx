"use client";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import { agendaStore } from "@/lib/agenda-store";
import { MONTHS_LONG, labelShort } from "@/lib/dates";
import { useDoctors } from "@/lib/doctors";
import { useToday } from "@/lib/hooks";
import { patientsStore } from "@/lib/patients";
import { paymentsStore } from "@/lib/payments";
import { PERIOD_NAMES, type Period, type Range, type Report, type Table, buildReports, fmtCell } from "@/lib/reports";
import { toast } from "@/lib/toast";

function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const chip = (on: boolean): React.CSSProperties => ({ cursor: "pointer", minHeight: 40, padding: "0 16px", borderRadius: 999, border: 0, fontWeight: 700, fontSize: 14, fontFamily: "inherit", background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)" });
const btn = (primary = false): React.CSSProperties => ({ cursor: "pointer", minHeight: 42, padding: "0 16px", borderRadius: 12, border: 0, display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, fontFamily: "inherit", background: primary ? "var(--grad-btn)" : "var(--surface)", color: primary ? "#fff" : "var(--ink-900)", boxShadow: primary ? "none" : "inset 0 0 0 1px var(--line)" });
const dateInput: React.CSSProperties = { height: 40, borderRadius: 10, border: "1px solid var(--line)", padding: "0 10px", fontSize: 14, background: "var(--surface)", color: "inherit", fontFamily: "inherit" };

/** Tabla de datos con encabezado fijo, números alineados a la derecha y fila de totales. */
function DataTable({ t, empty }: { t: Table; empty: string }) {
  const num = (c: number) => !!t.money?.includes(c) || !!t.pct?.includes(c) || (t.rows.length > 0 && typeof t.rows[0][c] === "number");
  const th: React.CSSProperties = { position: "sticky", top: 0, background: "var(--brand-50)", color: "var(--brand-800)", fontSize: 12, fontWeight: 800, padding: "10px 12px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" };
  return (
    <div style={{ overflow: "auto", maxHeight: 420, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <table className="tnum" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 14 }}>
        <thead>
          <tr>{t.columns.map((c, i) => <th key={c} scope="col" style={{ ...th, textAlign: num(i) ? "right" : "left" }}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {t.rows.map((r, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? "var(--bone)" : "transparent" }}>
              {r.map((v, c) => <td key={c} style={{ padding: "9px 12px", textAlign: num(c) ? "right" : "left", borderBottom: "1px solid var(--line)", whiteSpace: typeof v === "number" || String(v).length < 24 ? "nowrap" : "normal" }}>{fmtCell(t, c, v)}</td>)}
            </tr>
          ))}
          {t.rows.length === 0 && <tr><td colSpan={t.columns.length} style={{ padding: 20, textAlign: "center", color: "var(--ink-500)" }}>{empty}</td></tr>}
        </tbody>
        {t.total && t.rows.length > 0 && (
          <tfoot>
            <tr>{t.total.map((v, c) => <td key={c} style={{ padding: "10px 12px", fontWeight: 800, textAlign: num(c) ? "right" : "left", background: "var(--brand-50)", whiteSpace: "nowrap" }}>{fmtCell(t, c, v)}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function Reportes() {
  const today = useToday();
  const [{ appts }] = agendaStore.useStore();
  const [payments] = paymentsStore.useStore();
  const [patients] = patientsStore.useStore();
  const doctors = useDoctors();
  const [period, setPeriod] = useState<Period>(1);
  const [custom, setCustom] = useState<Range>({ from: "", to: "" });
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState("ing");

  if (!today) return null;
  const range0 = period === 3 && !custom.from && !custom.to ? { from: today.slice(0, 8) + "01", to: today } : custom;
  const { reports, summary, range } = buildReports({ today, period, custom: period === 3 ? range0 : undefined, appts, payments, patients, doctors });
  const periodLabel = period === 1 ? `${MONTHS_LONG[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}` : period === 2 ? `año ${today.slice(0, 4)}` : `${labelShort(range.from)} al ${labelShort(range.to)}`;
  const money = (n: number) => "S/ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const shown = reports.find((r) => r.id === sel) ?? reports[0];
  const stamp = `${["semana", "mes", "anio", "rango"][period]}-${range.from}_${range.to}`;

  async function excelAll() {
    setBusy(true);
    try {
      const { buildWorkbook } = await import("@/lib/reports-xlsx");
      download(`reportes-${stamp}.xlsx`, await buildWorkbook({ reports, summary, periodLabel, appts, doctors, range }));
      toast("Excel descargado");
    } catch {
      toast("No se pudo generar el Excel");
    }
    setBusy(false);
  }
  async function excelOne(r: Report) {
    try {
      const { buildReportWorkbook } = await import("@/lib/reports-xlsx");
      download(`${r.id}-${stamp}.xlsx`, await buildReportWorkbook(r, periodLabel));
      toast("Excel descargado");
    } catch {
      toast("No se pudo generar el Excel");
    }
  }

  return (
    <div style={{ padding: "24px 28px 48px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Reportes</h1>
          <div style={{ color: "var(--ink-500)", fontSize: 14 }}>{periodLabel} · calculado con las citas, cobros y pacientes registrados</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => window.print()} style={btn()}><Icon name="printer" size={18} />Imprimir</button>
          <button type="button" onClick={excelAll} disabled={busy} style={{ ...btn(true), opacity: busy ? 0.7 : 1 }}><Icon name="download" size={18} />{busy ? "Generando…" : "Descargar Excel"}</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Periodo">
        {PERIOD_NAMES.map((n, i) => <button key={n} type="button" aria-pressed={period === i} onClick={() => setPeriod(i as Period)} style={chip(period === i)}>{n}</button>)}
        {period === 3 && (
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Desde <input type="date" value={range.from} max={today} onChange={(e) => setCustom({ ...range, from: e.target.value })} style={dateInput} /></label>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Hasta <input type="date" value={range.to} max={today} onChange={(e) => setCustom({ ...range, to: e.target.value })} style={dateInput} /></label>
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
        {[["Citas atendidas", String(summary.attended)], ["Citas agendadas", String(summary.total)], ["No-show", summary.noShowPct === null ? "—" : `${summary.noShowPct}%`], ["Ingresos", money(summary.income)]].map(([l, v]) => (
          <div key={l} style={{ background: "var(--surface)", borderRadius: 16, padding: "14px 18px", boxShadow: "var(--shadow-md)" }}>
            <div style={{ fontSize: 13, color: "var(--ink-500)", fontWeight: 600 }}>{l}</div>
            <div className="tnum" style={{ fontSize: 26, fontWeight: 800 }}>{v}</div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Reportes" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {reports.map((r) => <button key={r.id} type="button" role="tab" aria-selected={shown.id === r.id} onClick={() => setSel(r.id)} style={chip(shown.id === r.id)}>{r.title}</button>)}
      </div>

      {[shown].map((r) => (
        <section key={r.id} aria-label={r.title} style={{ background: "var(--surface)", borderRadius: 16, padding: 18, boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{r.title}</h2>
              <div style={{ fontSize: 13, color: "var(--ink-500)" }}>{r.sub}</div>
            </div>
            <button type="button" onClick={() => excelOne(r)} style={btn()}><Icon name="download" size={16} />Excel</button>
          </div>
          <DataTable t={r.summary} empty="Sin datos en este periodo" />
          <details>
            <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 14, color: "var(--brand-text)", minHeight: 32 }}>Ver detalle · {r.detail.title} ({r.detail.table.rows.length})</summary>
            <div style={{ marginTop: 10 }}><DataTable t={r.detail.table} empty="Sin registros en este periodo" /></div>
          </details>
        </section>
      ))}
    </div>
  );
}
