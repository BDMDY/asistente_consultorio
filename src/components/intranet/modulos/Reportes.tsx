"use client";
import { useState } from "react";
import { agendaStore } from "@/lib/agenda-store";
import { MONTHS_LONG, labelShort } from "@/lib/dates";
import { useDoctors } from "@/lib/doctors";
import { useToday } from "@/lib/hooks";
import { patientsStore } from "@/lib/patients";
import { paymentsStore } from "@/lib/payments";
import { PERIOD_NAMES, type Period, buildReports, detailRows, fmtValue } from "@/lib/reports";
import { toast } from "@/lib/toast";
import { Actions, BarChart, ModuleLayout, N, type Row, SheetSub } from "./kit";

function csv(name: string, rows: (string | number)[][]) {
  const t = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + t], { type: "text/csv" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const money = (n: number) => "S/ " + n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export function Reportes() {
  const today = useToday();
  const [{ appts }] = agendaStore.useStore();
  const [payments] = paymentsStore.useStore();
  const [patients] = patientsStore.useStore();
  const doctors = useDoctors();
  const [chip, setChip] = useState(1);
  const [sel, setSel] = useState<string | "all" | null>(null);
  const period = chip as Period;

  if (!today) return null;
  const { reports, summary, range } = buildReports({ today, period, appts, payments, patients, doctors });
  const periodLabel = [`${labelShort(range.from)} al ${labelShort(range.to)}`, `${MONTHS_LONG[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}`, `año ${today.slice(0, 4)}`][chip];
  const file = (n: string) => `${n}-${["semana", "mes", "anio"][chip]}-${today}.csv`;
  const total = (r: (typeof reports)[number]) => r.bars.reduce((n, [, v]) => n + v, 0);
  const summaryOf = (r: (typeof reports)[number]) =>
    r.bars.length === 0 || (r.unit !== "%" && total(r) === 0) ? "Sin datos en este periodo"
      : r.id === "ocu" ? r.bars.map(([l, v]) => `${l} ${v}%`).join(" · ")
      : r.id === "ing" ? `${money(total(r))} cobrados`
      : r.id === "nue" ? `${total(r)} pacientes nuevos`
      : `${total(r)} citas canceladas`;
  const rows: Row[] = reports.map((r) => ({ id: r.id, t: r.title, sub: summaryOf(r), badge: "Ver", tone: N }));
  const cur = reports.find((r) => r.id === sel);

  function exportAll() {
    const d = detailRows({ appts, payments, doctors, range });
    csv(file("reportes"), [
      ["DentAssist · reportes", periodLabel], [],
      ["Resumen"], ["Citas atendidas", summary.attended], ["Citas agendadas (sin canceladas)", summary.total], ["No-show (%)", summary.noShowPct ?? "—"], ["Ingresos (S/)", summary.income], [],
      ...reports.flatMap((r) => [[r.title, r.sub], ["Concepto", r.unit ? `Valor (${r.unit})` : "Valor"], ...r.bars.map(([l, v]): (string | number)[] => [l, v]), []]),
      ["Detalle de citas"], ["Fecha", "Tramo (0 = 09:00)", "Paciente", "Servicio", "Doctor", "Estado", "Duración (min)"], ...d.appts, [],
      ["Detalle de cobros"], ["Fecha", "Comprobante", "Paciente", "Concepto", "Método", "Monto (S/)"], ...d.payments,
    ]);
  }

  return (
    <ModuleLayout title="Reportes" sub={`${periodLabel} · calculado con las citas, cobros y pacientes registrados`}
      kpis={[{ l: "Citas atendidas", v: String(summary.attended) }, { l: "No-show", v: summary.noShowPct === null ? "—" : `${summary.noShowPct}%`, c: summary.noShowPct ? "var(--warning-fg)" : undefined }, { l: "Ingresos", v: money(summary.income) }]}
      chips={[...PERIOD_NAMES]} chip={chip} onChip={setChip} query="" onQuery={() => {}} showSearch={false} cta="Exportar todo" onCta={() => setSel("all")} rows={rows}
      onOpen={(id) => setSel(id)} onClose={() => setSel(null)} panelTitle={sel === "all" ? "Exportar todo" : (cur?.title ?? "")}
      panel={sel === "all" ? (
        <>
          <SheetSub sub={`Resumen, los 4 reportes y el detalle de citas y cobros · ${periodLabel}`} badge={`Periodo: ${PERIOD_NAMES[chip]}`} tone={N} />
          <Actions items={[
            { t: "Descargar todo (CSV)", kind: "p", icon: "download", run: () => { exportAll(); setSel(null); toast("Descarga iniciada"); } },
            { t: "Imprimir / guardar PDF", icon: "printer", run: () => window.print() },
          ]} />
        </>
      ) : cur ? (
        <>
          <SheetSub sub={`${cur.sub} · ${periodLabel}`} badge={`Periodo: ${PERIOD_NAMES[chip]}`} tone={N} />
          {cur.bars.length === 0 || (cur.unit !== "%" && total(cur) === 0)
            ? <div style={{ padding: 18, borderRadius: 12, border: "1.5px dashed var(--brand-200)", textAlign: "center", fontSize: 14, color: "var(--ink-500)" }}>Aún no hay datos en este periodo.</div>
            : <BarChart bars={(() => { const mx = Math.max(...cur.bars.map(([, v]) => v), 1); return cur.bars.map(([l, v]) => ({ l, v: fmtValue(v, cur.unit), h: Math.max(6, Math.round((v / mx) * 100)) })); })()} />}
          <Actions items={[
            { t: "Descargar Excel (CSV)", kind: "p", icon: "download", run: () => { csv(file(cur.id), [[cur.title, periodLabel], ["Concepto", cur.unit ? `Valor (${cur.unit})` : "Valor"], ...cur.bars.map(([l, v]): (string | number)[] => [l, v])]); setSel(null); toast("Descarga iniciada"); } },
            { t: "Imprimir / guardar PDF", icon: "printer", run: () => window.print() },
            { t: "Compartir por WhatsApp", icon: "share-2", run: () => window.open("https://wa.me/?text=" + encodeURIComponent(`${cur.title} (${periodLabel}): ${cur.bars.map(([l, v]) => `${l} ${fmtValue(v, cur.unit)}`).join(", ") || "sin datos"}`), "_blank", "noopener") },
          ]} />
        </>
      ) : null} />
  );
}
