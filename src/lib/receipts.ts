import { type Appt, hm } from "./agenda";
import { inProgress } from "./attention";
import { type TreatmentPlan, planItems, sessionPrice } from "./clinical";
import { type Service, sessionValue } from "./media";
import { type Payment } from "./payments";

/**
 * Código visible de una cita (por ejemplo CIT-7K3QX): se deriva de su identificador, sirve para enlazar la cita
 * con sus cobros, el comprobante de la sesión y los reportes.
 */
export const apptCode = (id: number) => "CIT-" + (Math.abs(id) % 60466176).toString(36).toUpperCase().padStart(5, "0");

/** Cita de hoy del paciente a la que se asocia un cobro hecho fuera de la agenda (la que está en curso; si no, la más reciente del día). */
export function todaysApptOf(appts: Appt[], patient: string, today: string): Appt | null {
  const mine = appts.filter((a) => a.p === patient && a.date === today && a.st !== "cancelada" && a.st !== "bloqueo" && a.st !== "no-show" && a.st !== "reprogramada");
  return mine.find((a) => inProgress(a)) ?? mine.sort((x, y) => y.slot - x.slot)[0] ?? null;
}

/** Cita que lleva ese código (o null). */
export const apptByCode = (list: Appt[], code: string) => list.find((a) => apptCode(a.id) === code.trim().toUpperCase()) ?? null;

export interface SessionGroup {
  code: string;
  appt: Appt | null;
  /** cobros vigentes de la sesión, de más antiguo a más reciente */
  lines: Payment[];
  /** cobros anulados de la sesión */
  voided: Payment[];
  total: number;
  /** comprobantes distintos emitidos en la sesión */
  receipts: string[];
  /** total por método de pago */
  byMethod: [string, number][];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function buildGroup(code: string, appt: Appt | null, mine: Payment[]): SessionGroup {
  const sorted = mine.slice().sort((a, b) => a.at.localeCompare(b.at));
  const lines = sorted.filter((p) => !p.voided);
  const methods = new Map<string, number>();
  for (const p of lines) methods.set(p.method, round2((methods.get(p.method) ?? 0) + p.amount));
  return {
    code,
    appt,
    lines,
    voided: sorted.filter((p) => p.voided),
    total: round2(lines.reduce((n, p) => n + p.amount, 0)),
    receipts: [...new Set(lines.map((p) => p.no))],
    byMethod: [...methods.entries()],
  };
}

/** Todos los pagos de una misma cita, agrupados: líneas, total, comprobantes y método. */
export function sessionGroup(apptId: number, payments: Payment[], appts: Appt[]): SessionGroup {
  return buildGroup(apptCode(apptId), appts.find((a) => a.id === apptId) ?? null, payments.filter((p) => p.apptId === apptId));
}

/** Comprobante de cobros sin cita: las líneas que comparten número. */
export const receiptGroup = (no: string, payments: Payment[]): SessionGroup => buildGroup(no, null, payments.filter((p) => p.no === no));

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const money = (n: number) => "S/ " + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Comprobante de la sesión (HTML imprimible): todos los cobros de la cita, con su código, comprobantes, método y total. */
export function sessionReceiptHtml(g: SessionGroup, o: { clinic: string; doctor?: string; when: (iso: string) => string; day: (iso: string) => string; /** costo unitario (valor de una sesión) de un cobro */ unit?: (p: Payment) => number }): string {
  const a = g.appt;
  const rows = g.lines.map((p) => `<tr><td>${esc(o.when(p.at))}</td><td>${esc(p.no)}</td><td>${esc(p.concept)}</td><td style="text-align:right">${money(o.unit?.(p) ?? p.amount)}</td><td>${esc(p.method)}</td><td style="text-align:right">${money(p.amount)}</td></tr>`).join("");
  const voided = g.voided.length ? `<p style="color:#888;font-size:12px">Cobros anulados de esta sesión (no incluidos): ${g.voided.map((p) => `${esc(p.no)} ${money(p.amount)}`).join(", ")}</p>` : "";
  return `<!doctype html><meta charset="utf-8"><title>Comprobante de la cita ${esc(g.code)}</title>
<body style="font-family:system-ui,sans-serif;padding:28px;max-width:720px;margin:auto;color:#10241B">
<h2 style="margin:0">${esc(o.clinic)}</h2>
<p style="margin:4px 0 16px;color:#555">Comprobante de la cita · <b>${esc(g.code)}</b></p>
<table style="width:100%;font-size:14px;margin-bottom:12px"><tr><td><b>Paciente</b></td><td>${esc(a?.p ?? g.lines[0]?.patient ?? "")}</td></tr>
${a ? `<tr><td><b>Cita</b></td><td>${esc(o.day(a.date))} · ${hm(a.slot)}–${hm(a.slot + a.dur)}</td></tr>` : ""}
${o.doctor ? `<tr><td><b>Atendió</b></td><td>${esc(o.doctor)}</td></tr>` : ""}
${a ? `<tr><td><b>Servicio de la cita</b></td><td>${esc(a.s)}</td></tr>` : ""}</table>
<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;border-bottom:2px solid #10241B"><th>Fecha y hora</th><th>Comprobante</th><th>Tratamiento aplicado</th><th style="text-align:right">Costo unitario</th><th>Método</th><th style="text-align:right">Monto cobrado</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr style="border-top:2px solid #10241B"><td colspan="5"><b>Total pagado en la cita</b></td><td style="text-align:right"><b>${money(g.total)}</b></td></tr></tfoot></table>
<p style="font-size:13px;color:#555">Pagado con: ${g.byMethod.map(([m, v]) => `${esc(m)} ${money(v)}`).join(" · ") || "—"} · ${g.receipts.length} comprobante${g.receipts.length === 1 ? "" : "s"} (${g.receipts.map(esc).join(", ")})</p>
${voided}<p style="color:#888;font-size:12px">Comprobante de pago (demo). Código de cita ${esc(g.code)}.</p></body>`;
}


/** Costo unitario de un cobro: valor de una sesión del tratamiento (precio ÷ sesiones) en el plan del paciente o en el catálogo; si no se conoce, lo cobrado. */
export function unitCostOf(p: Payment, plans: Record<number, TreatmentPlan>, services: Service[]): number {
  const item = p.itemId !== undefined && p.patientId !== undefined ? planItems(plans[p.patientId]).find((x) => x.id === p.itemId) : undefined;
  if (item) return sessionPrice(item);
  const sv = services.find((x) => x.name === p.concept);
  const v = sv ? sessionValue(sv) : NaN;
  return v > 0 ? v : p.amount;
}
