import type { ModData } from "./mod";

export type DiscMode = "Sin descuento" | "Código" | "Campaña" | "Manual";
export interface DiscInput { mode: DiscMode; code: string; camp: string; type: "%" | "S/"; val: number; motive: string }
export interface DiscResult { amt: number; label: string; err: string; t: "" | "code" | "camp" | "manual"; id: string; total: number }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Calcula el descuento sobre `base` según el modo (código, campaña vigente o manual con motivo). */
export function computeDiscount(base: number, i: DiscInput, desc: ModData["desc"]): DiscResult {
  let amt = 0, label = "", err = "", t: DiscResult["t"] = "", id = "";
  const calc = (x: { type: "%" | "S/"; val: number }) => (x.type === "%" ? (base * x.val) / 100 : x.val);
  if (i.mode === "Código") {
    const c = i.code.trim().toUpperCase();
    if (!c) err = "Escribe el código";
    else {
      const x = desc.codes.find((z) => z.code === c);
      if (!x) err = "El código no existe";
      else if (!x.on) err = "El código está inactivo";
      else if (x.max && (x.used || 0) >= x.max) err = "El código ya se agotó";
      else { amt = calc(x); label = x.code; t = "code"; id = x.id; }
    }
  } else if (i.mode === "Campaña") {
    const x = desc.camps.find((z) => z.n === i.camp);
    if (x) { amt = calc(x); label = x.n; t = "camp"; id = x.id; } else err = "Elige una campaña";
  } else if (i.mode === "Manual") {
    if (i.val > 0) {
      amt = i.type === "%" ? (base * i.val) / 100 : i.val;
      const m = i.motive.trim();
      label = "Manual" + (m ? " · " + m : "");
      t = "manual";
      if (i.type === "%" && i.val > 100) err = "El máximo es 100%";
      else if (!m) err = "Indica el motivo del descuento";
    } else err = "Indica el valor del descuento";
  }
  amt = Math.min(base, round2(amt));
  if (err) amt = 0;
  return { amt, label, err, t, id, total: round2(base - amt) };
}

/** Si se usó un código, suma un uso. */
export function consumeCode(desc: ModData["desc"], r: DiscResult): ModData["desc"] {
  return r.t === "code" ? { ...desc, codes: desc.codes.map((c) => (c.id === r.id ? { ...c, used: (c.used || 0) + 1 } : c)) } : desc;
}

export const NO_DISCOUNT: DiscInput = { mode: "Sin descuento", code: "", camp: "", type: "%", val: 0, motive: "" };
