import { type Service, nextServiceCode } from "./media";

/** Fila de la carga masiva ya interpretada. */
export interface BulkRow {
  /** fila de la hoja (para avisar de errores) */
  line: number;
  code: string;
  name: string;
  /** precio total del tratamiento; null = sin precio (por ejemplo, "a criterio del odontólogo") */
  price: number | null;
  /** pago inicial pactado (parte del precio total) */
  initial?: number;
  sessions: number;
  dur?: number;
  desc?: string;
  /** avisos que no impiden importar */
  notes: string[];
  action: "nuevo" | "actualizar";
  /** servicio existente que se actualiza */
  targetId?: number;
}

export interface BulkResult { rows: BulkRow[]; errors: string[] }

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

type Field = "code" | "name" | "price" | "initial" | "sessions" | "dur" | "desc";
const HEAD: [Field, RegExp][] = [
  ["code", /^(codigo|cod\b|code)/],
  ["name", /^(tratamiento|servicio|nombre|procedimiento)/],
  ["price", /^(precio|costo|valor|tarifa)/],
  ["initial", /^(pago inicial|inicial|cuota inicial|adelanto)/],
  ["sessions", /^(sesion|citas|n.? ?de sesiones|numero de sesiones)/],
  ["dur", /^(duracion|minutos|tiempo)/],
  ["desc", /^(descripcion|detalle|observacion)/],
];

/** Precio en cualquier formato habitual: 350, "S/ 350.00", "1,800", "S/. 1 200,50". null si no es un número. */
export function parsePriceCell(v: unknown): number | null {
  if (typeof v === "number") return v > 0 ? v : null;
  const t = text(v).replace(/s\/\.?/gi, "").replace(/\s/g, "");
  if (!t || !/^[\d.,]+$/.test(t)) return null;
  // coma decimal ("1200,50") frente a coma de miles ("1,800")
  const n = /,\d{1,2}$/.test(t) && !/\./.test(t) ? parseFloat(t.replace(",", ".")) : parseFloat(t.replace(/,/g, ""));
  return n > 0 ? n : null;
}

/**
 * Interpreta la hoja: busca la fila de encabezados (puede haber un título arriba), lee Tratamiento / Precio / Sesiones
 * (y opcionalmente Código, Duración y Descripción) y decide, contra el catálogo actual, qué se crea y qué se actualiza.
 */
export function parseServiceSheet(sheet: unknown[][], current: Service[]): BulkResult {
  const errors: string[] = [];
  const hi = sheet.findIndex((r) => r.some((c) => HEAD[1][1].test(norm(text(c)))));
  if (hi < 0) return { rows: [], errors: ["No encontré la columna «Tratamiento». Usa la plantilla o pon ese encabezado sobre los nombres."] };
  const col: Partial<Record<Field, number>> = {};
  sheet[hi].forEach((c, i) => {
    const h = norm(text(c));
    for (const [f, re] of HEAD) if (col[f] === undefined && re.test(h)) col[f] = i;
  });
  if (col.price === undefined) errors.push("No encontré la columna de precio: los servicios se importarán sin precio.");

  const byCode = new Map(current.filter((s) => s.code).map((s) => [s.code!.toUpperCase(), s]));
  const byName = new Map(current.map((s) => [norm(s.name), s]));
  const seen = new Map<string, number>(); // clave → posición en rows (el último gana)
  const rows: BulkRow[] = [];
  const taken: string[] = [];

  for (let i = hi + 1; i < sheet.length; i++) {
    const r = sheet[i];
    const get = (f: Field) => (col[f] === undefined ? undefined : r[col[f]!]);
    const name = text(get("name"));
    if (!name) continue;
    const notes: string[] = [];
    const raw = get("price");
    const price = parsePriceCell(raw);
    if (price === null) notes.push(text(raw) ? `Precio «${text(raw)}» no es un número: queda sin precio` : "Sin precio");
    let initial = parsePriceCell(get("initial")) ?? undefined;
    if (initial !== undefined && (price === null || initial >= price)) { notes.push(`Pago inicial ${initial} no es menor al precio: se ignora`); initial = undefined; }
    const sRaw = get("sessions");
    let sessions = Math.round(Number(sRaw));
    if (!(sessions >= 1)) {
      if (text(sRaw)) notes.push(`Sesiones «${text(sRaw)}» no es un número: se toma 1`);
      sessions = 1;
    }
    const dRaw = Number(get("dur"));
    const dur = dRaw >= 15 ? Math.round(dRaw / 5) * 5 : undefined;
    const code = text(get("code")).toUpperCase();
    const target = (code && byCode.get(code)) || byName.get(norm(name));
    const key = target ? "id" + target.id : code ? "c" + code : "n" + norm(name);
    const row: BulkRow = { line: i + 1, code, name, price, ...(initial ? { initial } : {}), sessions, ...(dur ? { dur } : {}), ...(text(get("desc")) ? { desc: text(get("desc")) } : {}), notes, action: target ? "actualizar" : "nuevo", ...(target ? { targetId: target.id } : {}) };
    if (seen.has(key)) { rows[seen.get(key)!] = row; errors.push(`«${name}» aparece repetido (fila ${i + 1}): se usa la última.`); continue; }
    seen.set(key, rows.length);
    rows.push(row);
    if (code) taken.push(code);
  }
  // códigos propios duplicados dentro del archivo o contra otro servicio: se reasignan al importar
  const used = new Set(current.map((s) => s.code?.toUpperCase()));
  for (const r of rows) if (r.code && r.action === "nuevo" && used.has(r.code)) { r.notes.push(`El código ${r.code} ya existe: se asigna uno nuevo`); r.code = ""; }
  if (!rows.length) errors.push("La hoja no tiene tratamientos debajo de los encabezados.");
  return { rows, errors };
}

/** Aplica la carga al catálogo: actualiza los existentes (precio y sesiones; duración y descripción si vienen) y crea los nuevos con código. */
export function applyBulk(current: Service[], rows: BulkRow[]): { services: Service[]; created: number; updated: number } {
  let created = 0, updated = 0;
  const list = current.map((s) => ({ ...s }));
  const maxId = list.reduce((n, s) => Math.max(n, s.id), 0);
  let nextId = maxId;
  for (const r of rows) {
    if (r.action === "actualizar") {
      const s = list.find((x) => x.id === r.targetId);
      if (!s) continue;
      s.price = r.price === null ? "" : String(r.price);
      s.sessions = r.sessions;
      if (r.initial) s.initial = r.initial;
      else delete s.initial;
      if (r.dur) s.dur = r.dur;
      if (r.desc) s.desc = r.desc;
      if (r.code && !s.code) s.code = r.code;
      updated++;
    } else {
      list.push({ id: ++nextId, name: r.name, code: r.code || nextServiceCode(list), desc: r.desc ?? "", price: r.price === null ? "" : String(r.price), sessions: r.sessions, ...(r.initial ? { initial: r.initial } : {}), dur: r.dur ?? 30, on: true });
      created++;
    }
  }
  return { services: list, created, updated };
}

/** Plantilla para descargar: encabezados y dos filas de ejemplo. */
export const BULK_TEMPLATE: { head: string[]; rows: (string | number)[][] } = {
  head: ["Código (opcional)", "Tratamiento", "Precio total (S/)", "Pago inicial (S/, opcional)", "Sesiones", "Duración (min, opcional)", "Descripción (opcional)"],
  rows: [["", "Consulta", 50, "", 1, 30, "Evaluación y diagnóstico"], ["", "Ortodoncia con brackets", 3440, 1400, 12, 45, "Pago inicial 1,400 y 12 sesiones de (3,440 − 1,400) ÷ 12"]],
};
