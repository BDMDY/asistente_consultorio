import { type InvItem, type MatUse, modStore, uid } from "./mod";

export interface MatLine { invId: string; qty: number }

/** Liquidación ya registrada para una cita (o undefined). */
export const matUseOf = (mats: MatUse[] | undefined, apptId: number) => mats?.find((m) => m.apptId === apptId);

/** Valida las cantidades contra el stock; devuelve el mensaje de error o null. */
export function matError(inv: InvItem[], lines: MatLine[]): string | null {
  for (const l of lines) {
    const it = inv.find((i) => i.id === l.invId);
    if (!it) return "Un material ya no está en el inventario";
    if (!(l.qty > 0)) return `Indica la cantidad de ${it.n}`;
    if (l.qty > it.qty) return `No hay tanto stock de ${it.n} (${it.qty} ${it.u})`;
  }
  return null;
}

/**
 * Liquida los materiales usados en una atención: descuenta el stock del inventario y deja el registro en la cita.
 * Devuelve los productos que quedaron bajo el mínimo, o un error.
 */
export function liquidateMaterials(o: { apptId: number; patient: string; service: string }, lines: MatLine[]): { error: string } | { low: string[] } {
  const prev = modStore.get();
  if (matUseOf(prev.mats, o.apptId)) return { error: "Los materiales de esta cita ya fueron liquidados" };
  const used = lines.filter((l) => l.qty > 0);
  const err = matError(prev.inv, used);
  if (err) return { error: err };
  const inv = prev.inv.map((i) => {
    const l = used.find((x) => x.invId === i.id);
    return l ? { ...i, qty: Math.round((i.qty - l.qty) * 100) / 100 } : i;
  });
  const rec: MatUse = { id: uid(), apptId: o.apptId, at: new Date().toISOString(), patient: o.patient, service: o.service, lines: used.map((l) => { const it = prev.inv.find((i) => i.id === l.invId)!; return { invId: it.id, n: it.n, u: it.u, qty: l.qty }; }) };
  modStore.set({ ...prev, inv, mats: [rec, ...(prev.mats ?? [])] });
  return { low: inv.filter((i) => used.some((l) => l.invId === i.id) && i.qty < i.min).map((i) => i.n) };
}
