/** Fechas en hora de Lima (America/Lima, UTC-5 sin horario de verano). Las fechas se guardan como "YYYY-MM-DD". */
export const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
export const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;
export const MONTHS_LONG = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

const DAY_MS = 86_400_000;

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const parts = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
};

export const isISODate = (iso: string) => parts(iso) !== null;

/** Días desde la época (UTC puro, sin zona horaria). */
export function dayNumber(iso: string): number {
  const p = parts(iso);
  return p ? Math.round(Date.UTC(p.y, p.mo - 1, p.d) / DAY_MS) : NaN;
}

export function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export const addDays = (iso: string, n: number) => fromDayNumber(dayNumber(iso) + n);
export const diffDays = (a: string, b: string) => dayNumber(a) - dayNumber(b);

/** 0 = domingo … 6 = sábado */
export const weekday = (iso: string) => new Date(dayNumber(iso) * DAY_MS).getUTCDay();
export const dayOfMonth = (iso: string) => parts(iso)?.d ?? 0;

export function labelShort(iso: string) {
  const p = parts(iso)!;
  return `${WEEKDAYS_SHORT[weekday(iso)]} ${p.d} ${MONTHS_SHORT[p.mo - 1]}`;
}

export function labelLong(iso: string) {
  const p = parts(iso)!;
  return `${WEEKDAYS_LONG[weekday(iso)]} ${p.d} de ${MONTHS_LONG[p.mo - 1]}`;
}

/** Siguiente día de atención (no domingo) a partir de `iso`, inclusive. */
export function nextOpenDay(iso: string) {
  return weekday(iso) === 0 ? addDays(iso, 1) : iso;
}

/** Minutos transcurridos del día en Lima (para ocultar horarios que ya pasaron hoy). */
export function limaMinutesNow(now: Date = new Date()): number {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => +(p.find((x) => x.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** "14 oct 2026" */
export function labelDate(iso: string) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS_SHORT[p.mo - 1]} ${p.y}` : iso;
}
