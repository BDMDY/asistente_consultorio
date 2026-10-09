import { payItem, plansStore } from "./clinical";
import { PAY_METHODS, type PayMethod, type Payment, paymentsStore } from "./payments";
import { type Range, limaDateOf } from "./reports";

/** Cobros cuya fecha (Lima) cae dentro del rango, de los más recientes a los más antiguos. */
export function paymentsInRange(list: Payment[], range: Range | null): Payment[] {
  return list.filter((p) => !range || (limaDateOf(p.at) >= range.from && limaDateOf(p.at) <= range.to)).sort((a, b) => b.at.localeCompare(a.at));
}

/** Total cobrado por método de pago (solo cobros vigentes), en el orden habitual de los métodos. */
export function totalsByMethod(list: Payment[]): [PayMethod, number][] {
  return PAY_METHODS.map((m): [PayMethod, number] => [m, Math.round(list.filter((p) => !p.voided && p.method === m).reduce((n, p) => n + p.amount, 0) * 100) / 100]);
}

export const sumLive = (list: Payment[]) => Math.round(list.filter((p) => !p.voided).reduce((n, p) => n + p.amount, 0) * 100) / 100;

/** Anula (o restablece) un cobro. Un cobro anulado no cuenta en finanzas ni en reportes y deja de figurar como pagado en su tratamiento. */
export function setVoided(p: Payment, voided: boolean) {
  paymentsStore.update((l) => l.map((x) => (x.id === p.id ? { ...x, voided: voided ? true : undefined } : x)));
  if (p.itemId && p.patientId !== undefined) {
    const pid = p.patientId, item = p.itemId;
    plansStore.update((all) => (all[pid] ? { ...all, [pid]: payItem(all[pid], item, voided ? -p.amount : p.amount) } : all));
  }
}
