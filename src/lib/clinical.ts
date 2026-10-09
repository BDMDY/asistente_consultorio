"use client";
import { newId } from "./ids";
import { defineStore } from "./store";

// ───────────── Notas de la historia clínica ─────────────
export interface ClinicalNote { id: number; t: string; /** ISO */ date: string }
export const notesStore = defineStore<Record<number, ClinicalNote[]>>("da-notes-v1", () => ({
  1: [
    { id: 3, t: "Control mensual · Ajuste de arco superior. Sin dolor.", date: "2026-10-14" },
    { id: 2, t: "Colocación de brackets · Metálicos, ambas arcadas.", date: "2026-04-10" },
    { id: 1, t: "Primera consulta · Evaluación y plan de tratamiento.", date: "2026-03-20" },
  ],
}), { remote: { name: "notes", empty: () => ({}) } });

export function addNote(patientId: number, t: string, date: string) {
  notesStore.update((all) => ({ ...all, [patientId]: [{ id: newId(), t, date }, ...(all[patientId] ?? [])] }));
}

// ───────────── Plan de tratamiento (por paciente) ─────────────
/**
 * Un tratamiento del plan = un servicio con su propio plan de sesiones: sesiones previstas y hechas, precio total y lo pagado.
 * Se pueden agregar más tratamientos en cualquier momento (por ejemplo, tras la evaluación odontológica).
 */
export interface PlanItem { id: string; name: string; /** sesiones previstas */ total: number; /** sesiones hechas */ done: number; price: number; /** monto pagado a este tratamiento */ paid?: number; /** fecha de alta (AAAA-MM-DD) */ at?: string }
/** Plan del paciente: la lista de sus tratamientos (`items`); `name`, `total`, `done` y `price` son los totales. */
export interface TreatmentPlan { name: string; total: number; done: number; price: number; paidBase: number; items?: PlanItem[] }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Tratamientos del plan (un plan antiguo, sin lista, equivale a un único tratamiento con lo pagado en `paidBase`). */
export function planItems(plan?: TreatmentPlan): PlanItem[] {
  if (!plan) return [];
  return plan.items ?? [{ id: "main", name: plan.name, total: plan.total, done: plan.done, price: plan.price, paid: plan.paidBase }];
}

/** Plan con la lista de tratamientos dada y los totales recalculados. */
export function withItems(_plan: TreatmentPlan | undefined, items: PlanItem[]): TreatmentPlan {
  return {
    paidBase: 0,
    items,
    name: items.map((i) => i.name).join(" + "),
    total: items.reduce((n, i) => n + i.total, 0),
    done: items.reduce((n, i) => n + i.done, 0),
    price: round2(items.reduce((n, i) => n + i.price, 0)),
  };
}

/** Precio de una sesión de ese tratamiento (precio total entre sesiones previstas). */
export const sessionPrice = (it: PlanItem) => (it.total > 0 ? round2(it.price / it.total) : it.price);
/** Saldo por pagar de un tratamiento. */
export const itemBalance = (it: PlanItem) => Math.max(0, round2(it.price - (it.paid ?? 0)));
/** Total pagado en el plan. */
export const planPaid = (plan?: TreatmentPlan) => round2(planItems(plan).reduce((n, i) => n + (i.paid ?? 0), 0));

/** Agrega tratamientos al plan (lo crea si no existe). */
export const addItems = (plan: TreatmentPlan | undefined, items: PlanItem[]) => withItems(plan, [...planItems(plan), ...items]);

/** Quita un tratamiento del plan; devuelve undefined si no queda ninguno. */
export function removeItem(plan: TreatmentPlan, id: string): TreatmentPlan | undefined {
  const rest = planItems(plan).filter((i) => i.id !== id);
  return rest.length ? withItems(plan, rest) : undefined;
}

/** Una sesión de tratamiento: suma una sesión hecha (sin pasar de las previstas) y el monto cobrado, por cada línea. */
export function applyLines(plan: TreatmentPlan, lines: { planItem: string; amount: number }[]): TreatmentPlan {
  return withItems(plan, planItems(plan).map((it) => {
    const mine = lines.filter((l) => l.planItem === it.id);
    return mine.length ? { ...it, done: Math.min(it.total, it.done + 1), paid: round2((it.paid ?? 0) + mine.reduce((n, l) => n + l.amount, 0)) } : it;
  }));
}

/** Registra un pago a un tratamiento sin contar una sesión. */
export function payItem(plan: TreatmentPlan, id: string, amount: number): TreatmentPlan {
  return withItems(plan, planItems(plan).map((it) => (it.id === id ? { ...it, paid: round2((it.paid ?? 0) + amount) } : it)));
}

/** Suma una sesión hecha a cada tratamiento indicado (sin pasar de las previstas). */
export function advance(plan: TreatmentPlan, ids: string[]): TreatmentPlan {
  return withItems(plan, planItems(plan).map((i) => (ids.includes(i.id) ? { ...i, done: Math.min(i.total, i.done + 1) } : i)));
}
export const plansStore = defineStore<Record<number, TreatmentPlan>>("da-plans-v1", () => ({
  1: { name: "Ortodoncia con brackets", total: 18, done: 9, price: 4800, paidBase: 2400 },
}), { remote: { name: "plans", empty: () => ({}) } });

// ───────────── Archivos (metadatos; el binario irá a Supabase Storage) ─────────────
export interface PatientFile { id: number; n: string; s: string; date: string }
export const filesStore = defineStore<Record<number, PatientFile[]>>("da-files-v1", () => ({
  1: [{ id: 1, n: "panoramica.jpg", s: "2.4 MB", date: "2026-09-02" }],
}), { remote: { name: "files", empty: () => ({}) } });

// ───────────── Historia inicial (anamnesis) ─────────────
export type YN = "si" | "no";
export interface Anamnesis { v: Record<string, string>; yn: Record<string, YN>; done?: boolean; at?: number }
export const anamnesisStore = defineStore<Record<number, Anamnesis>>("da-anamnesis-v1", () => ({}), { remote: { name: "anamnesis", empty: () => ({}) } });

export const emptyAnam = (): Anamnesis => ({ v: {}, yn: {} });
export function patchAnam(patientId: number, patch: Partial<Anamnesis>) {
  anamnesisStore.update((all) => ({ ...all, [patientId]: { ...(all[patientId] ?? emptyAnam()), ...patch, at: Date.now() } }));
}

/** [clave, texto, placeholder de detalle si responde "Sí"] */
export type YNQ = [string, string, string?];
export const RISKS: YNQ[] = [
  ["trat", "¿Está Ud. bajo tratamiento médico?"], ["med", "¿Está tomando algún medicamento?", "¿Cuál?"], ["oper", "¿Le han practicado alguna operación?"],
  ["transf", "¿Ha recibido transfusión de sangre?"], ["drogas", "¿Ha consumido o consume drogas?"],
  ["alergia", "¿Tiene alergia a penicilinas, anestesia, aspirina, yodo, merthiolate, otro?", "¿A qué?"], ["presion", "¿Sufre de la presión arterial?", "Alta / Baja"],
  ["sangra", "¿Al cortarse sangra excesivamente?"], ["sanguineo", "¿Padece o ha padecido de algún problema sanguíneo? (anemia, leucemia, hemofilia, déficit de vit. K)", "¿Cuál?"],
  ["vih", "¿Es Ud. VIH +?"], ["retro", "¿Toma algún medicamento retroviral?"], ["embarazo", "¿Está Ud. embarazada?", "Semanas"],
  ["anticonc", "¿Está tomando actualmente pastillas anticonceptivas?"], ["nauseas", "¿Sufre de náuseas?"], ["vomito", "¿Se induce al vómito frecuentemente?"],
];
export const SUFRE: YNQ[] = [
  ["venereas", "Enf. venéreas"], ["corazon", "Problemas del corazón"], ["hepatitis", "Hepatitis"], ["fiebre", "Fiebre reumática"], ["asma", "Asma"],
  ["diabetes", "Diabetes"], ["ulcera", "Úlcera gástrica"], ["tiroides", "Tiroides"], ["atm", "¿Ha tenido limitaciones al abrir o cerrar la boca?"], ["herpes", "¿Sufre de herpes o aftas recurrentes?"],
];
export const HABITOS: YNQ[] = [
  ["unas", "Morderse las uñas o labios"], ["fuma", "¿Fuma?", "Cigarrillos al día"], ["citricos", "¿Consume alimentos cítricos?"],
  ["objetos", "¿Muerde objetos con los dientes?"], ["apret", "Apretamiento dentario"], ["bucal", "Respirador bucal"],
];
/** [clave, etiqueta, filas] */
export type TXTQ = [string, string, number];
export const TXT_INICIO: TXTQ[] = [["motivo", "Motivo de consulta", 2], ["antec", "Antecedente familiar", 2], ["enf", "Enfermedad actual", 3]];
export const TXT_ACLAR: TXTQ[] = [["aclar", 'Especificaciones del cuestionario (detalle de las respuestas "Sí")', 3]];
export const TXT_EGEN: TXTQ[] = [
  ["ecto", "1. Ectoscopía (apreciación general)", 2], ["piel", "2. Piel y anexos (temperatura, humedad, textura, pigmentaciones, lesiones)", 2], ["celular", "4. Tejido celular subcutáneo (edemas, nódulos, tumores)", 2],
];
export const VITALES: [string, string][] = [["temp", "Temp. (°C)"], ["pulso", "Pulso (lpm)"], ["pa", "P.A. (mmHg)"], ["fr", "Frec. resp. (rpm)"]];
export const TXT_ESTO: TXTQ[] = [
  ["craneo", "1. Cráneo (tamaño, forma, simetría, cuero cabelludo)", 2], ["cara", "2. Cara (facies, ojos, nariz, oídos, otros)", 2], ["cuello", "3. Cuello (ganglios, aumento de volumen, pulsaciones, tiroides)", 2],
  ["simetria", "4. Simetría, forma y perfil de cara", 2], ["maxilares", "5. Maxilares", 2], ["salivales", "6. Glándulas salivales", 2], ["atm2", "7. A.T.M.", 2], ["labios", "8. Labios", 2],
  ["vestibulos", "9. Vestíbulos (conducto de Stenon, surco vestibular, frenillos)", 2], ["paladar", "10. Paladar duro y blando", 2], ["orofaringe", "11. Orofaringe (lig. pterigo-maxilar)", 2],
  ["lengua", "12. Lengua", 2], ["piso", "13. Piso de boca (surco lingual, conducto de Wharton)", 2],
];
export const TXT_CIERRE: TXTQ[] = [["obs", "Observaciones", 3], ["plan", "Plan de tratamiento", 4]];

/** Respuestas "Sí" que generan alerta médica en la ficha. */
export const ALERT_LABEL: Record<string, string> = {
  trat: "En tratamiento médico", med: "Toma medicación", alergia: "Alergia a medicamentos", presion: "Presión arterial alterada", sangra: "Sangrado excesivo",
  sanguineo: "Problema sanguíneo", vih: "VIH+", retro: "Medicación retroviral", embarazo: "Embarazo", corazon: "Problemas del corazón", hepatitis: "Hepatitis",
  fiebre: "Fiebre reumática", asma: "Asma", diabetes: "Diabetes", ulcera: "Úlcera gástrica", tiroides: "Tiroides", venereas: "Enf. venérea",
};

const YN_KEYS = [...RISKS, ...SUFRE, ...HABITOS].map((x) => x[0]);
const KEY_TEXTS = ["motivo", "antec", "enf"];

export function anamProgress(a: Anamnesis) {
  const answered = YN_KEYS.filter((k) => a.yn[k]).length;
  const texts = KEY_TEXTS.filter((k) => (a.v[k] ?? "").trim()).length;
  const pct = Math.round(((answered + texts) / (YN_KEYS.length + KEY_TEXTS.length)) * 100);
  const missing = [
    YN_KEYS.length - answered ? `${YN_KEYS.length - answered} preguntas sin responder` : "",
    !(a.v.motivo ?? "").trim() ? "falta el motivo de consulta" : "",
  ].filter(Boolean).join(" · ");
  return { pct, missing };
}

export function derivedAlerts(a: Anamnesis): string[] {
  return YN_KEYS.filter((k) => a.yn[k] === "si" && ALERT_LABEL[k]).map((k) =>
    k === "alergia" && (a.v.x_alergia ?? "").trim() ? "Alergia: " + a.v.x_alergia.trim() : ALERT_LABEL[k],
  );
}

// ───────────── Odontograma ─────────────
export type ToothKind = "s" | "w" | "x";
export type Tool = "caries" | "obturado" | "sellante" | "fractura" | "ausente" | "extraccion" | "corona" | "endodoncia" | "implante" | "sano";
export type Surface = "V" | "P" | "L" | "M" | "D" | "O";
export interface Tooth { s: Partial<Record<Surface, Tool>>; w: Tool | null; n: string }
export type Teeth = Record<string, Tooth>;
export interface Odontogram { t: Teeth; at?: number }
export const odontogramStore = defineStore<Record<number, Odontogram>>("da-odontogram-v1", () => ({}), { remote: { name: "odontogram", empty: () => ({}) } });

/** [clave, etiqueta, color, tipo (s = superficie, w = diente completo, x = borrar), glifo] */
export const ODO_TOOLS: [Tool, string, string, ToothKind, string][] = [
  ["caries", "Caries (por tratar)", "var(--error-fg)", "s", ""], ["obturado", "Obturado (realizado)", "var(--info-fg)", "s", ""],
  ["sellante", "Sellante", "var(--success-fg)", "s", ""], ["fractura", "Fractura", "var(--warning-fg)", "s", ""],
  ["ausente", "Ausente", "var(--ink-500)", "w", "✕"], ["extraccion", "Extracción indicada", "var(--error-fg)", "w", "✕"],
  ["corona", "Corona", "var(--warning-fg)", "w", "C"], ["endodoncia", "Endodoncia", "#8A2A7A", "w", "E"],
  ["implante", "Implante", "var(--brand-600)", "w", "I"], ["sano", "Sano / borrar", "var(--ink-300)", "x", ""],
];
export const ODO_SURF_BG: Partial<Record<Tool, string>> = { caries: "var(--error-fg)", obturado: "var(--info-fg)", sellante: "var(--success-fg)", fractura: "var(--warning-fg)" };
export const ODO_WHOLE_BG: Partial<Record<Tool, string>> = { ausente: "var(--line)", extraccion: "var(--error-bg)", corona: "var(--warning-bg)", endodoncia: "var(--st-no-show-bg)", implante: "var(--brand-100)" };
export const ODO_GLYPH: Partial<Record<Tool, string>> = { ausente: "✕", extraccion: "✕", corona: "C", endodoncia: "E", implante: "I" };
export const ODO_GLYPH_COLOR: Partial<Record<Tool, string>> = { ausente: "var(--ink-500)", extraccion: "var(--error-fg)", corona: "var(--warning-fg)", endodoncia: "#8A2A7A", implante: "var(--brand-700)" };
export const ODO_SURF_NAME: Record<Surface, string> = { V: "Vestibular", P: "Palatino", L: "Lingual", M: "Mesial", D: "Distal", O: "Oclusal / incisal" };
export const ODO_WHOLE_LABEL: Partial<Record<Tool, string>> = { ausente: "ausente", extraccion: "extracción indicada", corona: "corona", endodoncia: "endodoncia", implante: "implante" };
export const ODO_SURF_HINT: Record<Surface, string> = {
  V: "cara hacia los labios o mejilla", P: "cara hacia el paladar (dientes superiores)", L: "cara hacia la lengua (dientes inferiores)",
  M: "cara que mira hacia la línea media", D: "cara que se aleja de la línea media", O: "cara de masticación (borde en dientes anteriores)",
};
export type Dentition = "perm" | "temp";
export const ODO_ARCH: Record<Dentition, [number[], number[]]> = {
  perm: [[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]],
  temp: [[55, 54, 53, 52, 51, 61, 62, 63, 64, 65], [85, 84, 83, 82, 81, 71, 72, 73, 74, 75]],
};

export function toothName(num: number, den: Dentition): string {
  const q = Math.floor(num / 10), p = num % 10;
  const N = den === "temp"
    ? ["", "incisivo central", "incisivo lateral", "canino", "primer molar", "segundo molar"]
    : ["", "incisivo central", "incisivo lateral", "canino", "primer premolar", "segundo premolar", "primer molar", "segundo molar", "tercer molar"];
  const Q: Record<number, string> = { 1: "superior derecho", 2: "superior izquierdo", 3: "inferior izquierdo", 4: "inferior derecho", 5: "superior derecho", 6: "superior izquierdo", 7: "inferior izquierdo", 8: "inferior derecho" };
  return `Diente ${num} · ${N[p]} ${Q[q]}`;
}

/** Superficie que corresponde a cada celda (arriba, abajo, izquierda, derecha, centro) según el cuadrante. */
export function surfaceMap(num: number): { top: Surface; bottom: Surface; left: Surface; right: Surface; center: Surface } {
  const q = Math.floor(num / 10);
  const up = [1, 2, 5, 6].includes(q), rs = [1, 4, 5, 8].includes(q);
  return { top: up ? "V" : "L", bottom: up ? "P" : "V", left: rs ? "D" : "M", right: rs ? "M" : "D", center: "O" };
}

export const isUpper = (num: number) => [1, 2, 5, 6].includes(Math.floor(num / 10));

/** Aplica la herramienta activa a un diente. Devuelve el nuevo estado o un error (diente ausente). */
export function applyTool(teeth: Teeth, num: number, surf: Surface | undefined, tool: Tool): { teeth: Teeth; error?: string } {
  const nt: Teeth = { ...teeth };
  const th: Tooth = nt[num] ? { ...nt[num] } : { s: {}, w: null, n: "" };
  th.s = { ...th.s };
  const kind = ODO_TOOLS.find((x) => x[0] === tool)![3];
  if (tool === "sano") {
    th.s = {};
    th.w = null;
  } else if (kind === "w") {
    th.w = th.w === tool ? null : tool;
  } else {
    if (th.w === "ausente") return { teeth, error: "El diente está marcado como ausente" };
    const k = surf ?? "O";
    if (th.s[k] === tool) delete th.s[k];
    else th.s[k] = tool;
  }
  if (!th.w && !Object.keys(th.s).length && !th.n) delete nt[num];
  else nt[num] = th;
  return { teeth: nt };
}

/** Hallazgos agrupados para el resumen de la historia clínica. */
export function odontogramFindings(teeth: Teeth) {
  const list: { t: string; c: string }[] = [];
  const grp: Record<string, string[]> = {};
  Object.keys(teeth).sort().forEach((n) => {
    const th = teeth[n];
    if (th.w) {
      list.push({ t: `${n} · ${ODO_WHOLE_LABEL[th.w]}`, c: ODO_GLYPH_COLOR[th.w] ?? "var(--ink-500)" });
      (grp[ODO_WHOLE_LABEL[th.w]!] ??= []).push(n);
    }
    (Object.keys(th.s) as Surface[]).forEach((k) => {
      const tool = th.s[k]!;
      list.push({ t: `${n} · ${k} · ${tool}`, c: ODO_SURF_BG[tool] ?? "var(--ink-500)" });
      (grp[tool] ??= []).push(`${n}-${k}`);
    });
  });
  return { list, grp };
}
