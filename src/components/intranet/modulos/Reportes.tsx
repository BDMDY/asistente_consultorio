"use client";
import { useState } from "react";
import { MONTHS_LONG } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { toast } from "@/lib/toast";
import { Actions, BarChart, ModuleLayout, N, type Row, SheetSub } from "./kit";

/** Datos de ejemplo hasta acumular historial; al conectar la base se calculan desde citas y cobros. */
type Report = { id: string; title: string; sub: string; bars: [string, number][]; unit: "%" | "S/" | "" };
const REPORTS: Report[] = [
  { id: "ocu", title: "Ocupación por doctor", sub: "Citas atendidas", bars: [["Quispe", 82], ["Paredes", 74], ["Rojas", 61]], unit: "%" },
  { id: "ing", title: "Ingresos por servicio", sub: "Soles cobrados", bars: [["Orto", 18400], ["Impl", 9800], ["Limp", 4200], ["Blanq", 3600]], unit: "S/" },
  { id: "nue", title: "Pacientes nuevos", sub: "Por semana", bars: [["S1", 8], ["S2", 11], ["S3", 7], ["S4", 8]], unit: "" },
  { id: "can", title: "Cancelaciones y motivos", sub: "Por motivo", bars: [["Pac.", 9], ["No resp.", 5], ["Repr.", 4]], unit: "" },
];
const FILTERS = ["Semana", "Mes", "Año"];
const PER = [0.25, 1, 12];

function csv(name: string, rows: (string | number)[][]) {
  const t = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + t], { type: "text/csv" }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function Reportes() {
  const today = useToday();
  const [chip, setChip] = useState(1);
  const [sel, setSel] = useState<string | "all" | null>(null);
  const per = PER[chip];
  const period = ["última semana", today ? `${MONTHS_LONG[Number(today.slice(5, 7)) - 1]} ${today.slice(0, 4)}` : "mes", today ? `año ${today.slice(0, 4)}` : "año"][chip];
  const rows: Row[] = REPORTS.map((r) => ({ id: r.id, t: r.title, sub: r.sub, badge: "Ver", tone: N }));
  const cur = REPORTS.find((r) => r.id === sel);
  const val = (v: number) => Math.round(v * per);

  return (
    <ModuleLayout title="Reportes" sub={`${period} · datos de ejemplo hasta acumular historial`} kpis={[{ l: "Citas atendidas", v: String(Math.round(286 * per)) }, { l: "No-show", v: "6%", c: "var(--warning-fg)" }]}
      chips={FILTERS} chip={chip} onChip={setChip} query="" onQuery={() => {}} showSearch={false} cta="Exportar todo" onCta={() => setSel("all")} rows={rows}
      onOpen={(id) => setSel(id)} onClose={() => setSel(null)} panelTitle={sel === "all" ? "Exportar todo" : (cur?.title ?? "")}
      panel={sel === "all" ? (
        <Actions items={[
          { t: "Descargar todo (CSV)", kind: "p", icon: "download", run: () => { csv(`reportes-${["semana", "mes", "año"][chip]}.csv`, [["Reporte", "Concepto", "Valor"], ...REPORTS.flatMap((r) => r.bars.map(([l, v]) => [r.title, l, val(v)]))]); setSel(null); toast("Descarga iniciada"); } },
          { t: "Imprimir / guardar PDF", icon: "printer", run: () => window.print() },
        ]} />
      ) : cur ? (
        <>
          <SheetSub sub={`${cur.sub} · ${period}`} badge={`Periodo: ${FILTERS[chip]}`} tone={N} />
          <BarChart bars={(() => { const mx = Math.max(...cur.bars.map(([, v]) => val(v))); return cur.bars.map(([l, v]) => ({ l, v: (cur.unit === "S/" ? "S/ " : "") + val(v).toLocaleString("en-US") + (cur.unit === "%" ? "%" : ""), h: Math.max(6, Math.round((val(v) / mx) * 70)) })); })()} />
          <Actions items={[
            { t: "Descargar Excel (CSV)", kind: "p", icon: "download", run: () => { csv(`${cur.id}.csv`, [["Concepto", "Valor"], ...cur.bars.map(([l, v]) => [l, val(v)])]); setSel(null); toast("Descarga iniciada"); } },
            { t: "Imprimir / guardar PDF", icon: "printer", run: () => window.print() },
            { t: "Compartir por WhatsApp", icon: "share-2", run: () => window.open("https://wa.me/?text=" + encodeURIComponent(`${cur.title}: ${cur.bars.map(([l, v]) => `${l} ${val(v)}`).join(", ")}`), "_blank", "noopener") },
          ]} />
        </>
      ) : null} />
  );
}
