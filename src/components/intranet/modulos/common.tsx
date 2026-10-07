"use client";
import { useState } from "react";
import { type DiscInput, type DiscMode, NO_DISCOUNT, computeDiscount } from "@/lib/discounts";
import type { ModData } from "@/lib/mod";
import { money0 } from "@/lib/mod";
import { ChipField, G, E, ListField, TextField } from "./kit";
import { SheetSub } from "./kit";

export const useDiscount = (base: number, desc: ModData["desc"]) => {
  const [i, setI] = useState<DiscInput>(NO_DISCOUNT);
  return { input: i, set: (p: Partial<DiscInput>) => setI((x) => ({ ...x, ...p })), result: computeDiscount(base, i, desc) };
};

const MODES: readonly DiscMode[] = ["Sin descuento", "Código", "Campaña", "Manual"];

/** Campos de descuento (código, campaña vigente o manual con motivo). */
export function DiscountFields({ input, set, desc }: { input: DiscInput; set: (p: Partial<DiscInput>) => void; desc: ModData["desc"] }) {
  return (
    <>
      <ChipField label="Descuento" value={input.mode} options={MODES} onChange={(mode) => set({ mode })} />
      {input.mode === "Código" && <TextField label="Código de descuento" value={input.code} onChange={(code) => set({ code })} />}
      {input.mode === "Campaña" && (
        <ListField label="Campaña vigente" info="Solo se muestran las campañas activas" value={input.camp ? [input.camp] : []} onChange={(v) => set({ camp: v[0] ?? "" })}
          items={desc.camps.filter((c) => c.on).map((c) => ({ v: c.n, t: c.n, r: c.type === "%" ? `${c.val}%` : money0(c.val) }))} />
      )}
      {input.mode === "Manual" && (
        <>
          <ChipField label="Tipo de descuento" value={input.type} options={["%", "S/"] as const} onChange={(type) => set({ type })} />
          <TextField label="Valor" value={input.val || ""} num onChange={(v) => set({ val: Number(v) || 0 })} />
          <TextField label="Motivo (obligatorio)" value={input.motive} onChange={(motive) => set({ motive })} />
        </>
      )}
    </>
  );
}

export function DiscountSummary({ base, total, amt, label, err }: { base: number; total: number; amt: number; label: string; err: string }) {
  return <SheetSub sub={`Subtotal ${money0(base)} · Descuento −${money0(amt)} · Total ${money0(total)}`} badge={err || label || "Sin descuento"} tone={err ? E : G} />;
}
