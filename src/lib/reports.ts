import { type Appt, SLOTS, hm } from "./agenda";
import { MONTHS_SHORT, WEEKDAYS_SHORT, addDays, dayNumber, dayOfMonth, fromDayNumber, isISODate, todayISO, weekday } from "./dates";
import type { Doctor } from "./media";
import { type Patient, samePatientName } from "./patients";
import { PAY_METHODS, type Payment } from "./payments";

/** Reportes en tablas, calculados con las citas, cobros y pacientes reales de la clínica. */
export type Period = 0 | 1 | 2 | 3;
export const PERIOD_NAMES = ["Semana", "Mes", "Año", "Personalizado"] as const;
export type Range = { from: string; to: string };

export type Cell = string | number;
/** Tabla de un reporte: `money` y `pct` marcan columnas numéricas con formato (índices de columna). */
export interface Table { columns: string[]; rows: Cell[][]; total?: Cell[]; money?: number[]; pct?: number[] }
export interface Report { id: string; title: string; sub: string; summary: Table; detail: { title: string; table: Table } }
export interface Summary { attended: number; noShowPct: number | null; income: number; total: number }

/** Periodo que termina hoy: últimos 7 días, el mes en curso, el año en curso o un rango elegido. */
export function periodRange(today: string, p: Period, custom?: Range): Range {
  if (p === 3) {
    const from = custom && isISODate(custom.from) ? custom.from : today;
    const to = custom && isISODate(custom.to) ? custom.to : today;
    return from <= to ? { from, to } : { from: to, to: from };
  }
  if (p === 0) return { from: addDays(today, -6), to: today };
  return { from: p === 1 ? today.slice(0, 8) + "01" : today.slice(0, 5) + "01-01", to: today };
}

const inRange = (d: string, r: Range) => d >= r.from && d <= r.to;
/** Fecha (Lima) de un instante ISO. */
export const limaDateOf = (iso: string) => todayISO(new Date(iso));

/** Los identificadores nuevos son microsegundos desde 1970: de ahí sale cuándo se registró un paciente (los de ejemplo, no). */
export function createdDateOfId(id: number): string | null {
  return id > 1e15 && id < 1e16 ? todayISO(new Date(id / 1000)) : null;
}

export function openDays(r: Range): number {
  let n = 0;
  for (let d = dayNumber(r.from); d <= dayNumber(r.to); d++) if (weekday(fromDayNumber(d)) !== 0) n++;
  return n;
}

/** Orden en que se listan los reportes. */
const ORDER = ["ing", "ingd", "serv", "sdia", "cli", "ocu", "nue", "can"];
const ACTIVE = new Set(["pendiente", "confirmada", "en-sala", "atendida", "reprogramada"]);
const STATUS = { pendiente: "Pendiente", confirmada: "Confirmada", "en-sala": "En sala", atendida: "Atendida", cancelada: "Cancelada", "no-show": "No-show", reprogramada: "Reprogramada" } as const;
const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number, total: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

export function cancelReason(a: Pick<Appt, "notes">): string {
  const m = /Cancelada: ([^·]+)/.exec(a.notes ?? "");
  return m ? m[1].trim() : "Sin motivo registrado";
}

/** Cómo se agrupan los pacientes nuevos según la duración del periodo: por día, por semana o por mes. */
function buckets(r: Range): { key: (d: string) => string; labels: string[] } {
  const days = dayNumber(r.to) - dayNumber(r.from) + 1;
  if (days <= 14) {
    const list = Array.from({ length: days }, (_, i) => addDays(r.from, i));
    return { key: (d) => d, labels: list.map((d) => d) };
  }
  if (days <= 100) {
    const weeks = Math.ceil(days / 7);
    return { key: (d) => "Sem " + (Math.floor((dayNumber(d) - dayNumber(r.from)) / 7) + 1), labels: Array.from({ length: weeks }, (_, i) => "Sem " + (i + 1)) };
  }
  const months: string[] = [];
  for (let d = r.from.slice(0, 7); d <= r.to.slice(0, 7); d = nextMonth(d)) months.push(d);
  return { key: (d) => d.slice(0, 7), labels: months };
}
const nextMonth = (ym: string) => { const [y, m] = ym.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; };
/** "2026-10-12" → "lun 12 oct" · "2026-10" → "oct 2026" · "Sem 2" queda igual. */
export function bucketLabel(l: string): string {
  if (isISODate(l)) return `${WEEKDAYS_SHORT[weekday(l)]} ${dayOfMonth(l)} ${MONTHS_SHORT[Number(l.slice(5, 7)) - 1]}`;
  return /^\d{4}-\d{2}$/.test(l) ? `${MONTHS_SHORT[Number(l.slice(5, 7)) - 1]} ${l.slice(0, 4)}` : l;
}

export function buildReports(i: { today: string; period: Period; custom?: Range; appts: Appt[]; payments: Payment[]; patients: Patient[]; doctors: Doctor[] }): { reports: Report[]; summary: Summary; range: Range } {
  const range = periodRange(i.today, i.period, i.custom);
  const appts = i.appts.filter((a) => inRange(a.date, range));
  const pays = i.payments.filter((p) => inRange(limaDateOf(p.at), range));
  const docName = (id: number) => i.doctors.find((d) => d.id === id)?.full ?? "Doctor sin asignar";
  const apptRow = (a: Appt): Cell[] => [a.date, hm(a.slot), a.p, a.s, docName(a.doc), STATUS[a.st], a.dur * 15];

  // Ocupación por doctor
  const capacity = openDays(range) * SLOTS;
  const ocuRows = i.doctors.map((d): Cell[] => {
    const mine = appts.filter((a) => a.doc === d.id && ACTIVE.has(a.st));
    const used = mine.reduce((n, a) => n + a.dur, 0);
    return [d.full, mine.length, used, capacity, capacity ? Math.min(100, pct(used, capacity)) : 0];
  });

  // Ingresos por servicio
  const byService = new Map<string, { n: number; sum: number }>();
  for (const p of pays) {
    const k = p.concept || "Sin concepto";
    const cur = byService.get(k) ?? { n: 0, sum: 0 };
    byService.set(k, { n: cur.n + 1, sum: cur.sum + p.amount });
  }
  const income = round2(pays.reduce((n, p) => n + p.amount, 0));
  const ingRows = [...byService.entries()].sort((a, b) => b[1].sum - a[1].sum).map(([k, v]): Cell[] => [k, v.n, round2(v.sum), pct(v.sum, income)]);

  // Pacientes nuevos
  const b = buckets(range);
  const fresh = new Map(b.labels.map((l) => [l, 0]));
  const newPatients: Cell[][] = [];
  for (const p of i.patients) {
    const c = createdDateOfId(p.id);
    if (c && inRange(c, range)) {
      fresh.set(b.key(c), (fresh.get(b.key(c)) ?? 0) + 1);
      newPatients.push([c, p.name, p.dni, p.phone, p.email ?? "", p.web ? "Reserva web" : "Registrado en la clínica"]);
    }
  }
  newPatients.sort((x, y) => String(x[0]).localeCompare(String(y[0])));

  // Cancelaciones
  const cancelled = appts.filter((a) => a.st === "cancelada");
  const reasons = new Map<string, number>();
  for (const a of cancelled) reasons.set(cancelReason(a), (reasons.get(cancelReason(a)) ?? 0) + 1);

  const attended = appts.filter((a) => a.st === "atendida").length;
  const noShow = appts.filter((a) => a.st === "no-show").length;
  const sumCol = (rows: Cell[][], c: number) => rows.reduce((n, r) => n + Number(r[c]), 0);

  // ── Reportes detallados ──
  const horaDe = (iso: string) => {
    const m = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
    return m;
  };

  // Servicios por día: una fila por día y servicio
  const sd = new Map<string, { date: string; svc: string; n: number; att: number; canc: number; sum: number }>();
  const sdRow = (date: string, svc: string) => {
    const k = date + "|" + svc;
    if (!sd.has(k)) sd.set(k, { date, svc, n: 0, att: 0, canc: 0, sum: 0 });
    return sd.get(k)!;
  };
  for (const a of appts) {
    const r = sdRow(a.date, a.s);
    if (a.st === "cancelada") r.canc++;
    else r.n++;
    if (a.st === "atendida") r.att++;
  }
  for (const p of pays) sdRow(limaDateOf(p.at), p.concept || "Sin concepto").sum += p.amount;
  const sdRows = [...sd.values()].sort((x, y) => x.date.localeCompare(y.date) || x.svc.localeCompare(y.svc));

  // Servicios del periodo (sirve también para un rango personalizado)
  const sv = new Map<string, { n: number; att: number; canc: number; ns: number; pays: number; sum: number }>();
  const svRow = (svc: string) => {
    if (!sv.has(svc)) sv.set(svc, { n: 0, att: 0, canc: 0, ns: 0, pays: 0, sum: 0 });
    return sv.get(svc)!;
  };
  for (const a of appts) {
    const r = svRow(a.s);
    if (a.st === "cancelada") r.canc++;
    else r.n++;
    if (a.st === "atendida") r.att++;
    if (a.st === "no-show") r.ns++;
  }
  for (const p of pays) { const r = svRow(p.concept || "Sin concepto"); r.pays++; r.sum += p.amount; }
  const svRows = [...sv.entries()].sort((x, y) => y[1].sum - x[1].sum || y[1].n - x[1].n).map(([k, v]): Cell[] => [k, v.n, v.att, v.canc, v.ns, v.pays, round2(v.sum), v.pays ? round2(v.sum / v.pays) : 0]);

  // Ingresos detallados: por día y método de pago
  const methodCols = [...PAY_METHODS];
  const byDay = new Map<string, { n: number; m: Record<string, number> }>();
  for (const p of pays) {
    const d = limaDateOf(p.at);
    const r = byDay.get(d) ?? { n: 0, m: {} };
    r.n++;
    r.m[p.method] = (r.m[p.method] ?? 0) + p.amount;
    byDay.set(d, r);
  }
  const idRows = [...byDay.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([d, r]): Cell[] => [d, r.n, ...methodCols.map((m) => round2(r.m[m] ?? 0)), round2(Object.values(r.m).reduce((n, v) => n + v, 0))]);
  const idTotal: Cell[] = ["Total", pays.length, ...methodCols.map((m) => round2(pays.filter((p) => p.method === m).reduce((n, p) => n + p.amount, 0))), income];
  const apptOf = (id?: number) => i.appts.find((a) => a.id === id);

  // Clientes detallado: pacientes con movimiento en el periodo (citas, cobros o registro)
  const todayISO0 = i.today;
  const cliRows: Cell[][] = [];
  const claimed = new Set<number>();
  for (const p of i.patients) {
    const mine = appts.filter((a) => (a.dni && p.dni && a.dni === p.dni) || samePatientName(a.p, p.name));
    const myPays = pays.filter((x) => samePatientName(x.patient, p.name));
    const created = createdDateOfId(p.id);
    const isNew = !!created && inRange(created, range);
    if (!mine.length && !myPays.length && !isNew) continue;
    mine.forEach((a) => claimed.add(a.id));
    const all = i.appts.filter((a) => a.st !== "cancelada" && ((a.dni && p.dni && a.dni === p.dni) || samePatientName(a.p, p.name)));
    const last = all.filter((a) => a.date <= todayISO0).sort((x, y) => y.date.localeCompare(x.date))[0];
    const next = all.filter((a) => a.date > todayISO0).sort((x, y) => x.date.localeCompare(y.date))[0];
    cliRows.push([p.name, p.dni, p.phone, p.email ?? "", p.web ? "Reserva web" : "Clínica", created ?? "—",
      mine.filter((a) => a.st !== "cancelada").length, mine.filter((a) => a.st === "atendida").length, mine.filter((a) => a.st === "cancelada").length, mine.filter((a) => a.st === "no-show").length,
      last?.date ?? "—", next?.date ?? "—", round2(myPays.reduce((n, x) => n + x.amount, 0)), p.alerts.join("; ")]);
  }
  // Citas de nombres sin ficha de paciente
  const orphan = new Map<string, Appt[]>();
  for (const a of appts) if (!claimed.has(a.id)) orphan.set(a.p, [...(orphan.get(a.p) ?? []), a]);
  for (const [name, list] of orphan) {
    cliRows.push([name, list[0].dni ?? "", list[0].phone ?? "", "", "Sin ficha", "—", list.filter((a) => a.st !== "cancelada").length, list.filter((a) => a.st === "atendida").length, list.filter((a) => a.st === "cancelada").length, list.filter((a) => a.st === "no-show").length, "—", "—", 0, ""]);
  }
  cliRows.sort((x, y) => String(x[0]).localeCompare(String(y[0])));

  return {
    range,
    summary: { attended, noShowPct: attended + noShow ? Math.round((noShow / (attended + noShow)) * 100) : null, income, total: appts.filter((a) => a.st !== "cancelada").length },
    reports: [
      {
        id: "ocu", title: "Ocupación por doctor", sub: "Tramos de 15 min agendados sobre la capacidad (lunes a sábado, 09:00–17:00)",
        summary: { columns: ["Doctor", "Citas", "Tramos agendados", "Capacidad (tramos)", "Ocupación %"], rows: ocuRows, pct: [4] },
        detail: { title: "Citas del periodo", table: { columns: ["Fecha", "Hora", "Paciente", "Servicio", "Doctor", "Estado", "Duración (min)"], rows: appts.slice().sort((x, y) => x.date.localeCompare(y.date) || x.slot - y.slot).map(apptRow) } },
      },
      {
        id: "ing", title: "Ingresos por servicio", sub: "Soles cobrados en el periodo",
        summary: { columns: ["Servicio", "Cobros", "Monto (S/)", "% del total"], rows: ingRows, total: ["Total", pays.length, income, ingRows.length ? 100 : 0], money: [2], pct: [3] },
        detail: { title: "Cobros del periodo", table: { columns: ["Fecha", "Comprobante", "Paciente", "Servicio", "Método", "Monto (S/)"], rows: pays.slice().sort((x, y) => x.at.localeCompare(y.at)).map((p): Cell[] => [limaDateOf(p.at), p.no, p.patient, p.concept, p.method, p.amount]), total: ["Total", "", "", "", "", income], money: [5] } },
      },
      {
        id: "nue", title: "Pacientes nuevos", sub: "Pacientes registrados en el periodo (los creados antes de usar el sistema no tienen fecha)",
        summary: { columns: ["Periodo", "Pacientes nuevos"], rows: [...fresh.entries()].map(([l, n]): Cell[] => [bucketLabel(l), n]), total: ["Total", newPatients.length] },
        detail: { title: "Pacientes registrados", table: { columns: ["Fecha de registro", "Paciente", "DNI", "Celular", "Correo", "Origen"], rows: newPatients } },
      },
      {
        id: "can", title: "Cancelaciones y motivos", sub: "Citas canceladas por motivo",
        summary: { columns: ["Motivo", "Cantidad", "% del total"], rows: [...reasons.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]): Cell[] => [k, n, pct(n, cancelled.length)]), total: ["Total", cancelled.length, cancelled.length ? 100 : 0], pct: [2] },
        detail: { title: "Citas canceladas", table: { columns: ["Fecha", "Hora", "Paciente", "Servicio", "Doctor", "Motivo"], rows: cancelled.slice().sort((x, y) => x.date.localeCompare(y.date) || x.slot - y.slot).map((a): Cell[] => [a.date, hm(a.slot), a.p, a.s, docName(a.doc), cancelReason(a)]) } },
      },
      {
        id: "ingd", title: "Ingresos detallados", sub: "Cobros por día y método de pago, con el detalle de cada comprobante",
        summary: { columns: ["Fecha", "Cobros", ...methodCols.map((m) => m + " (S/)"), "Total (S/)"], rows: idRows, total: idTotal, money: [...methodCols.map((_, k) => k + 2), methodCols.length + 2] },
        detail: { title: "Comprobantes", table: { columns: ["Fecha", "Hora", "Comprobante", "Paciente", "Servicio", "Doctor", "Método", "Monto (S/)"], rows: pays.slice().sort((x, y) => x.at.localeCompare(y.at)).map((p): Cell[] => [limaDateOf(p.at), horaDe(p.at), p.no, p.patient, p.concept, apptOf(p.apptId) ? docName(apptOf(p.apptId)!.doc) : "—", p.method, p.amount]), total: ["Total", "", "", "", "", "", "", income], money: [7] } },
      },
      {
        id: "serv", title: "Servicios", sub: "Citas, atención y cobros por servicio en el periodo (elige un rango personalizado para comparar fechas)",
        summary: { columns: ["Servicio", "Citas agendadas", "Atendidas", "Canceladas", "No-show", "Cobros", "Cobrado (S/)", "Ticket promedio (S/)"], rows: svRows, total: ["Total", sumCol(svRows, 1), sumCol(svRows, 2), sumCol(svRows, 3), sumCol(svRows, 4), sumCol(svRows, 5), round2(sumCol(svRows, 6)), pays.length ? round2(income / pays.length) : 0], money: [6, 7] },
        detail: { title: "Citas por servicio", table: { columns: ["Servicio", "Fecha", "Hora", "Paciente", "Doctor", "Estado", "Duración (min)"], rows: appts.slice().sort((x, y) => x.s.localeCompare(y.s) || x.date.localeCompare(y.date) || x.slot - y.slot).map((a): Cell[] => [a.s, a.date, hm(a.slot), a.p, docName(a.doc), STATUS[a.st], a.dur * 15]) } },
      },
      {
        id: "sdia", title: "Servicios por día", sub: "Cuántos servicios se agendaron, atendieron, cancelaron y cobraron cada día",
        summary: { columns: ["Fecha", "Servicio", "Citas agendadas", "Atendidas", "Canceladas", "Cobrado (S/)"], rows: sdRows.map((r): Cell[] => [r.date, r.svc, r.n, r.att, r.canc, round2(r.sum)]), total: ["Total", "", sdRows.reduce((n, r) => n + r.n, 0), sdRows.reduce((n, r) => n + r.att, 0), sdRows.reduce((n, r) => n + r.canc, 0), round2(sdRows.reduce((n, r) => n + r.sum, 0))], money: [5] },
        detail: { title: "Citas del periodo", table: { columns: ["Fecha", "Hora", "Paciente", "Servicio", "Doctor", "Estado", "Duración (min)"], rows: appts.slice().sort((x, y) => x.date.localeCompare(y.date) || x.slot - y.slot).map(apptRow) } },
      },
      {
        id: "cli", title: "Clientes detallado", sub: "Pacientes con citas, cobros o registro en el periodo, con su historial de asistencia y lo pagado",
        summary: { columns: ["Paciente", "DNI", "Celular", "Correo", "Origen", "Registro", "Citas", "Atendidas", "Canceladas", "No-show", "Última cita", "Próxima cita", "Pagado (S/)", "Alertas médicas"], rows: cliRows, total: ["Total", "", "", "", "", "", sumCol(cliRows, 6), sumCol(cliRows, 7), sumCol(cliRows, 8), sumCol(cliRows, 9), "", "", round2(sumCol(cliRows, 12)), ""], money: [12] },
        detail: { title: "Pacientes registrados en el periodo", table: { columns: ["Fecha de registro", "Paciente", "DNI", "Celular", "Correo", "Origen"], rows: newPatients } },
      },
    ].map((r) => (r.id === "ocu" ? { ...r, summary: { ...r.summary, total: ["Total", sumCol(ocuRows, 1), sumCol(ocuRows, 2), "", ""] } } : r))
      .sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id)),
  };
}

/** Todas las citas del periodo con su estado (la hoja "Citas" del Excel). */
export function allApptsTable(i: { appts: Appt[]; doctors: Doctor[]; range: Range }): Table {
  const doc = (id: number) => i.doctors.find((d) => d.id === id)?.full ?? "";
  return {
    columns: ["Fecha", "Hora", "Paciente", "Servicio", "Doctor", "Estado", "Duración (min)", "Origen"],
    rows: i.appts.filter((a) => inRange(a.date, i.range)).sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
      .map((a): Cell[] => [a.date, hm(a.slot), a.p, a.s, doc(a.doc), STATUS[a.st], a.dur * 15, a.web ? "Reserva web" : "Clínica"]),
  };
}

/** Texto de una celda según las columnas con formato de la tabla. */
export function fmtCell(t: Table, c: number, v: Cell): string {
  if (typeof v !== "number") return String(v);
  if (t.money?.includes(c)) return "S/ " + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (t.pct?.includes(c)) return v.toLocaleString("en-US", { maximumFractionDigits: 1 }) + "%";
  return v.toLocaleString("en-US");
}
