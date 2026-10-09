import { type InvItem } from "./mod";

export interface BulkMatRow {
  line: number;
  code: string;
  name: string;
  unit: string;
  qty: number;
  min?: number;
  venc?: string;
  notes: string[];
  action: "nuevo" | "actualizar";
  targetId?: string;
}
export interface BulkMatResult { rows: BulkMatRow[]; errors: string[] }

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const text = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

type Field = "code" | "name" | "unit" | "qty" | "min" | "venc";
const HEAD: [Field, RegExp][] = [
  ["code", /^(codigo|cod\b|code)/],
  ["name", /^(producto|material|insumo|articulo|nombre|descripcion)/],
  ["unit", /^(unidad|u\.?m\.?\b|medida)/],
  ["qty", /^(cantidad|stock|existencia|saldo|inicial)/],
  ["min", /^(minimo|stock minimo|stock min|reposicion)/],
  ["venc", /^(venc|caduc|fecha de venc)/],
];

/** Número con coma o punto decimal; null si no es un número válido (≥ 0). */
export function parseQty(v: unknown): number | null {
  if (typeof v === "number") return v >= 0 ? v : null;
  const t = text(v).replace(/\s/g, "");
  if (!/^\d+([.,]\d+)?$/.test(t)) return null;
  return parseFloat(t.replace(",", "."));
}

/** Fecha de vencimiento: Date de Excel, AAAA-MM-DD o DD/MM/AAAA. Devuelve AAAA-MM-DD o null. */
export function parseVenc(v: unknown): string | null {
  if (v instanceof Date && !isNaN(+v)) return new Date(+v + 12 * 3600e3).toISOString().slice(0, 10);
  const t = text(v);
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Siguiente código de producto: MAT-001, MAT-002… */
export function nextMatCode(inv: Pick<InvItem, "code">[], taken: string[] = []): string {
  const max = [...inv.map((i) => i.code ?? ""), ...taken].reduce((n, c) => Math.max(n, Number(/^MAT-(\d+)$/.exec(c)?.[1] ?? 0)), 0);
  return "MAT-" + String(max + 1).padStart(3, "0");
}

/** Interpreta la hoja (con título arriba si lo hay): Producto, Unidad, Cantidad, y opcionales Código, Stock mínimo y Vencimiento. */
export function parseMaterialSheet(sheet: unknown[][], current: InvItem[]): BulkMatResult {
  const errors: string[] = [];
  const hi = sheet.findIndex((r) => r.some((c) => HEAD[1][1].test(norm(text(c)))));
  if (hi < 0) return { rows: [], errors: ["No encontré la columna «Producto». Usa la plantilla o pon ese encabezado sobre los nombres."] };
  const col: Partial<Record<Field, number>> = {};
  sheet[hi].forEach((c, i) => {
    const h = norm(text(c));
    // «stock mínimo» debe ir a la columna de mínimo, no a la de cantidad
    const order: Field[] = ["code", "name", "unit", "min", "qty", "venc"];
    for (const f of order) { const re = HEAD.find((x) => x[0] === f)![1]; if (col[f] === undefined && re.test(h)) { col[f] = i; break; } }
  });
  if (col.qty === undefined) errors.push("No encontré la columna «Cantidad»: los productos nuevos empiezan en 0.");

  const byCode = new Map(current.filter((s) => s.code).map((s) => [s.code!.toUpperCase(), s]));
  const byName = new Map(current.map((s) => [norm(s.n), s]));
  const seen = new Map<string, number>();
  const rows: BulkMatRow[] = [];
  for (let i = hi + 1; i < sheet.length; i++) {
    const r = sheet[i];
    const get = (f: Field) => (col[f] === undefined ? undefined : r[col[f]!]);
    const name = text(get("name"));
    if (!name) continue;
    const notes: string[] = [];
    const qRaw = get("qty");
    let qty = parseQty(qRaw);
    if (qty === null) { if (text(qRaw)) notes.push(`Cantidad «${text(qRaw)}» no es un número: se toma 0`); qty = 0; }
    const mRaw = get("min");
    const min = parseQty(mRaw);
    if (min === null && text(mRaw)) notes.push(`Mínimo «${text(mRaw)}» no es un número: se ignora`);
    const vRaw = get("venc");
    const venc = parseVenc(vRaw);
    if (venc === null && text(vRaw) && !(vRaw instanceof Date)) notes.push(`Vencimiento «${text(vRaw)}» no se entiende (usa AAAA-MM-DD o DD/MM/AAAA)`);
    const code = text(get("code")).toUpperCase();
    const target = (code && byCode.get(code)) || byName.get(norm(name));
    const key = target ? "id" + target.id : "n" + norm(name);
    const row: BulkMatRow = { line: i + 1, code, name, unit: text(get("unit")) || "unid.", qty, ...(min !== null ? { min } : {}), ...(venc ? { venc } : {}), notes, action: target ? "actualizar" : "nuevo", ...(target ? { targetId: target.id } : {}) };
    if (seen.has(key)) { rows[seen.get(key)!] = row; errors.push(`«${name}» aparece repetido (fila ${i + 1}): se usa la última.`); continue; }
    seen.set(key, rows.length);
    rows.push(row);
  }
  if (!rows.length) errors.push("La hoja no tiene productos debajo de los encabezados.");
  return { rows, errors };
}

/** Aplica la carga: nuevos con código MAT-###; existentes con la cantidad sumada (entrada) o reemplazada (conteo de stock). */
export function applyMaterials(current: InvItem[], rows: BulkMatRow[], mode: "sumar" | "reemplazar", newId: () => string): { inv: InvItem[]; created: number; updated: number } {
  let created = 0, updated = 0;
  const inv = current.map((i) => ({ ...i }));
  for (const r of rows) {
    if (r.action === "actualizar") {
      const it = inv.find((x) => x.id === r.targetId);
      if (!it) continue;
      it.qty = Math.round((mode === "sumar" ? it.qty + r.qty : r.qty) * 100) / 100;
      if (r.min !== undefined) it.min = r.min;
      if (r.venc) it.venc = r.venc;
      if (r.unit && r.unit !== "unid.") it.u = r.unit;
      if (!it.code) it.code = r.code || nextMatCode(inv);
      updated++;
    } else {
      const taken = inv.some((x) => x.code?.toUpperCase() === r.code);
      inv.unshift({ id: newId(), code: r.code && !taken ? r.code : nextMatCode(inv), n: r.name, u: r.unit, qty: r.qty, min: r.min ?? 5, venc: r.venc ?? "" });
      created++;
    }
  }
  return { inv, created, updated };
}

export const MAT_TEMPLATE: { head: string[]; rows: (string | number)[][] } = {
  head: ["Código (opcional)", "Producto", "Unidad", "Cantidad", "Stock mínimo (opcional)", "Vencimiento (opcional)"],
  rows: [["", "Resina A2", "g", 30, 10, ""], ["", "Anestesia lidocaína", "ml", 50, 20, "2027-06-30"]],
};
