"use client";
import { useState } from "react";
import { NO_DISCOUNT } from "@/lib/discounts";
import { useMod } from "@/lib/mod";
import { btnOutline } from "@/components/ui/kit";
import { DiscountFields, DiscountSummary, useDiscount } from "./modulos/common";

/** Estado del descuento de un cobro: se calcula sobre `base` con los códigos y campañas de la clínica. */
export const useChargeDiscount = (base: number) => useDiscount(base, useMod().data.desc);

/**
 * Bloque «Aplicar descuento o campaña» para cualquier vista de cobro (agenda, ficha del paciente, planes…).
 * Plegado por defecto; al plegarlo se quita el descuento para que no quede aplicado sin verse.
 */
export default function DiscountSection({ dc, base }: { dc: ReturnType<typeof useChargeDiscount>; base: number }) {
  const { data } = useMod();
  const [open, setOpen] = useState(dc.input.mode !== NO_DISCOUNT.mode);
  const r = dc.result;
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} style={{ ...btnOutline, alignSelf: "flex-start" }}>+ Aplicar descuento o campaña</button>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b style={{ fontSize: 14 }}>Descuento o campaña</b>
        <button type="button" onClick={() => { dc.set(NO_DISCOUNT); setOpen(false); }} style={{ ...btnOutline, minHeight: 36, padding: "0 12px", fontSize: 13 }}>Quitar</button>
      </div>
      <DiscountFields input={dc.input} set={dc.set} desc={data.desc} />
      <DiscountSummary base={base} total={r.total} amt={r.amt} label={r.label} err={r.err} />
    </div>
  );
}
