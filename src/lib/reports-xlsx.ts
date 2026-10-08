import { type Cell, type Report, type Summary, type Table, allApptsTable } from "./reports";
import type { Appt } from "./agenda";
import type { Doctor } from "./media";

type XCell = { value: string | number; type?: StringConstructor | NumberConstructor; fontWeight?: "bold"; format?: string; backgroundColor?: string; textColor?: string; align?: "left" | "center" | "right" };

const head = (v: string): XCell => ({ value: v, fontWeight: "bold", backgroundColor: "#E6F4EC", textColor: "#0B4D2C" });
const bold = (v: string | number): XCell => ({ value: v, fontWeight: "bold" });

function cellOf(t: Table, c: number, v: Cell, isTotal = false): XCell {
  if (typeof v === "number") {
    const format = t.money?.includes(c) ? '"S/" #,##0.00' : t.pct?.includes(c) ? '0.0"%"' : "#,##0";
    return { value: v, type: Number, format, ...(isTotal ? { fontWeight: "bold" as const } : {}) };
  }
  return { value: v === "" ? "" : String(v), type: String, ...(isTotal ? { fontWeight: "bold" as const } : {}) };
}

function sheetOf(t: Table, title?: string): XCell[][] {
  const rows: XCell[][] = [];
  if (title) rows.push([bold(title)], []);
  rows.push(t.columns.map(head));
  for (const r of t.rows) rows.push(r.map((v, c) => cellOf(t, c, v)));
  if (t.total) rows.push(t.total.map((v, c) => cellOf(t, c, v, true)));
  return rows;
}

const widths = (t: Table) => t.columns.map((c, i) => ({ width: Math.min(46, Math.max(12, c.length + 4, ...t.rows.slice(0, 200).map((r) => String(r[i] ?? "").length + 2))) }));
const safe = (s: string) => s.replace(/[\\/?*[\]:]/g, "").slice(0, 31);

/** Libro de Excel (.xlsx) con una hoja de resumen, una por reporte, el detalle y todas las citas del periodo. */
export async function buildWorkbook(i: { reports: Report[]; summary: Summary; periodLabel: string; appts: Appt[]; doctors: Doctor[]; range: { from: string; to: string } }): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const kpi: XCell[][] = [
    [bold("DentAssist · Reportes")], [{ value: i.periodLabel }], [],
    [head("Indicador"), head("Valor")],
    [{ value: "Citas atendidas" }, { value: i.summary.attended, type: Number }],
    [{ value: "Citas agendadas (sin canceladas)" }, { value: i.summary.total, type: Number }],
    [{ value: "No-show (%)" }, i.summary.noShowPct === null ? { value: "—" } : { value: i.summary.noShowPct, type: Number, format: '0"%"' }],
    [{ value: "Ingresos (S/)" }, { value: i.summary.income, type: Number, format: '"S/" #,##0.00' }],
  ];
  const sheets: { data: XCell[][]; sheet: string; columns?: { width: number }[] }[] = [{ data: kpi, sheet: "Resumen", columns: [{ width: 36 }, { width: 18 }] }];
  for (const r of i.reports) {
    sheets.push({ data: sheetOf(r.summary, r.title), sheet: safe(r.title), columns: widths(r.summary) });
    sheets.push({ data: sheetOf(r.detail.table, r.detail.title), sheet: safe("Det · " + r.title), columns: widths(r.detail.table) });
  }
  const all = allApptsTable({ appts: i.appts, doctors: i.doctors, range: i.range });
  sheets.push({ data: sheetOf(all, "Todas las citas del periodo"), sheet: "Citas", columns: widths(all) });
  return writeXlsxFile(sheets).toBlob();
}

/** Excel de un solo reporte: resumen y detalle en hojas separadas. */
export async function buildReportWorkbook(r: Report, periodLabel: string): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const sheets = [
    { data: sheetOf(r.summary, `${r.title} · ${periodLabel}`), sheet: safe(r.title), columns: widths(r.summary) },
    { data: sheetOf(r.detail.table, r.detail.title), sheet: safe("Det · " + r.title), columns: widths(r.detail.table) },
  ];
  return writeXlsxFile(sheets).toBlob();
}
