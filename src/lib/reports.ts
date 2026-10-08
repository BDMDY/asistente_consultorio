import { type Appt, SLOTS } from "./agenda";
import { MONTHS_SHORT, WEEKDAYS_SHORT, addDays, dayNumber, dayOfMonth, fromDayNumber, todayISO, weekday } from "./dates";
import type { Doctor } from "./media";
import type { Patient } from "./patients";
import type { Payment } from "./payments";

/** Reportes calculados con las citas, cobros y pacientes reales de la clínica. */
export type Period = 0 | 1 | 2;
export const PERIOD_NAMES = ["Semana", "Mes", "Año"] as const;

export interface Report { id: string; title: string; sub: string; unit: "%" | "S/" | ""; bars: [string, number][] }
export interface Summary { attended: number; noShowPct: number | null; income: number; total: number }

/** Periodo que termina hoy: últimos 7 días, el mes en curso o el año en curso. */
export function periodRange(today: string, p: Period): { from: string; to: string } {
  if (p === 0) return { from: addDays(today, -6), to: today };
  return { from: p === 1 ? today.slice(0, 8) + "01" : today.slice(0, 5) + "01-01", to: today };
}

const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;
/** Fecha (Lima) de un instante ISO. */
export const limaDateOf = (iso: string) => todayISO(new Date(iso));

/** Los identificadores nuevos son microsegundos desde 1970: de ahí sale cuándo se registró un paciente (los de ejemplo, no). */
export function createdDateOfId(id: number): string | null {
  return id > 1e15 && id < 1e16 ? todayISO(new Date(id / 1000)) : null;
}

export function openDays(r: { from: string; to: string }): number {
  let n = 0;
  for (let d = dayNumber(r.from); d <= dayNumber(r.to); d++) if (weekday(fromDayNumber(d)) !== 0) n++;
  return n;
}

const surname = (name: string) => name.replace(/^(Dra?\.)\s*/, "").split(" ").slice(-1)[0] ?? name;
const ACTIVE = new Set(["pendiente", "confirmada", "en-sala", "atendida", "reprogramada"]);

export function cancelReason(a: Pick<Appt, "notes">): string {
  const m = /Cancelada: ([^·]+)/.exec(a.notes ?? "");
  return m ? m[1].trim() : "Sin motivo registrado";
}

function bucketsOf(p: Period, r: { from: string; to: string }): { key: (d: string) => string; labels: string[] } {
  if (p === 0) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(r.from, i));
    return { key: (d) => d, labels: days.map((d) => `${WEEKDAYS_SHORT[weekday(d)]} ${dayOfMonth(d)}`) };
  }
  if (p === 1) {
    const weeks = Math.floor((dayOfMonth(r.to) - 1) / 7) + 1;
    return { key: (d) => "S" + (Math.floor((dayOfMonth(d) - 1) / 7) + 1), labels: Array.from({ length: weeks }, (_, i) => "S" + (i + 1)) };
  }
  const months = Number(r.to.slice(5, 7));
  return { key: (d) => MONTHS_SHORT[Number(d.slice(5, 7)) - 1], labels: MONTHS_SHORT.slice(0, months).map(String) };
}

export function buildReports(i: { today: string; period: Period; appts: Appt[]; payments: Payment[]; patients: Patient[]; doctors: Doctor[] }): { reports: Report[]; summary: Summary; range: { from: string; to: string } } {
  const range = periodRange(i.today, i.period);
  const appts = i.appts.filter((a) => inRange(a.date, range));
  const pays = i.payments.filter((p) => inRange(limaDateOf(p.at), range));

  const capacity = openDays(range) * SLOTS;
  const occupancy: [string, number][] = i.doctors.map((d) => {
    const used = appts.filter((a) => a.doc === d.id && ACTIVE.has(a.st)).reduce((n, a) => n + a.dur, 0);
    return [surname(d.name), capacity ? Math.min(100, Math.round((used / capacity) * 100)) : 0];
  });

  const byService = new Map<string, number>();
  for (const p of pays) byService.set(p.concept || "Sin concepto", (byService.get(p.concept || "Sin concepto") ?? 0) + p.amount);
  const income = [...byService.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]): [string, number] => [k, Math.round(v * 100) / 100]);

  const b = bucketsOf(i.period, range);
  const fresh = new Map(b.labels.map((l) => [l, 0]));
  for (const p of i.patients) {
    const c = createdDateOfId(p.id);
    if (c && inRange(c, range)) fresh.set(b.key(c), (fresh.get(b.key(c)) ?? 0) + 1);
  }

  const reasons = new Map<string, number>();
  for (const a of appts) if (a.st === "cancelada") reasons.set(cancelReason(a), (reasons.get(cancelReason(a)) ?? 0) + 1);

  const attended = appts.filter((a) => a.st === "atendida").length;
  const noShow = appts.filter((a) => a.st === "no-show").length;
  return {
    range,
    summary: {
      attended,
      noShowPct: attended + noShow ? Math.round((noShow / (attended + noShow)) * 100) : null,
      income: Math.round(pays.reduce((n, p) => n + p.amount, 0) * 100) / 100,
      total: appts.filter((a) => a.st !== "cancelada").length,
    },
    reports: [
      { id: "ocu", title: "Ocupación por doctor", sub: "Tramos agendados sobre la capacidad (lun–sáb, 09:00–17:00)", unit: "%", bars: occupancy },
      { id: "ing", title: "Ingresos por servicio", sub: "Soles cobrados", unit: "S/", bars: income },
      { id: "nue", title: "Pacientes nuevos", sub: i.period === 0 ? "Por día" : i.period === 1 ? "Por semana" : "Por mes", unit: "", bars: [...fresh.entries()] },
      { id: "can", title: "Cancelaciones y motivos", sub: "Citas canceladas por motivo", unit: "", bars: [...reasons.entries()].sort((a, b) => b[1] - a[1]) },
    ],
  };
}

export const fmtValue = (v: number, unit: Report["unit"]) => (unit === "S/" ? "S/ " + v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : unit === "%" ? v + "%" : String(v));

/** Filas del detalle de citas y cobros del periodo, para el exportado completo. */
export function detailRows(i: { appts: Appt[]; payments: Payment[]; doctors: Doctor[]; range: { from: string; to: string } }) {
  const doc = (id: number) => i.doctors.find((d) => d.id === id)?.full ?? "";
  return {
    appts: i.appts.filter((a) => inRange(a.date, i.range)).sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
      .map((a): (string | number)[] => [a.date, a.slot, a.p, a.s, doc(a.doc), a.st, a.dur * 15]),
    payments: i.payments.filter((p) => inRange(limaDateOf(p.at), i.range)).sort((a, b) => a.at.localeCompare(b.at))
      .map((p): (string | number)[] => [limaDateOf(p.at), p.no, p.patient, p.concept, p.method, p.amount]),
  };
}
