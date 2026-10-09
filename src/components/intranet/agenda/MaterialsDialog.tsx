"use client";
import { useState } from "react";
import { CloseBtn, Modal, btnOutline, btnPrimary, fieldStyle } from "@/components/ui/kit";
import type { Appt } from "@/lib/agenda";
import { finishAttention } from "@/lib/agenda-actions";
import { liquidateMaterials, matError } from "@/lib/materials";
import { useMod } from "@/lib/mod";
import { toast } from "@/lib/toast";

/**
 * Liquidación de materiales al finalizar la atención: lo usado se descuenta solo del inventario.
 * Con `finish` también marca el fin de la atención; sin él, solo liquida una cita ya finalizada.
 */
export default function MaterialsDialog({ a, finish, sheet, onClose }: { a: Appt; finish: boolean; sheet?: boolean; onClose: () => void }) {
  const { data } = useMod();
  const [lines, setLines] = useState<{ invId: string; qty: string }[]>([]);
  const [tried, setTried] = useState(false);
  const free = data.inv.filter((i) => !lines.some((l) => l.invId === i.id));
  const parsed = lines.map((l) => ({ invId: l.invId, qty: parseFloat(l.qty.replace(",", ".")) }));
  const err = matError(data.inv, parsed);

  function done(withMaterials: boolean) {
    if (withMaterials && lines.length) {
      if (err) return setTried(true);
    }
    const min = finish ? finishAttention(a) : null;
    let msg = min !== null ? `Atención finalizada · ${min} min (programados ${a.dur * 15})` : "";
    if (withMaterials && lines.length) {
      const r = liquidateMaterials({ apptId: a.id, patient: a.p, service: a.s }, parsed);
      if ("error" in r) return toast(r.error);
      msg += `${msg ? " · " : ""}${lines.length} ${lines.length === 1 ? "material liquidado" : "materiales liquidados"}, stock actualizado`;
      if (r.low.length) msg += ` · stock bajo: ${r.low.join(", ")}`;
    }
    toast(msg || "Sin materiales que liquidar");
    onClose();
  }
  const inp = { ...fieldStyle, height: 42, fontSize: 15 };
  return (
    <Modal onClose={onClose} width={520} label="Liquidación de materiales" sheet={sheet} z={120}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 22 }}>Liquidación de materiales</b><CloseBtn onClick={onClose} /></div>
        <span style={{ fontSize: 14, color: "var(--ink-500)" }}>{a.p} · {a.s}. Lo que indiques se descuenta automáticamente del inventario.</span>
        {data.inv.length === 0 && <div style={{ fontSize: 14, color: "var(--ink-500)" }}>Aún no hay productos en el inventario (Módulos → Inventario).</div>}
        {lines.map((l) => {
          const it = data.inv.find((i) => i.id === l.invId);
          const q = parseFloat(l.qty.replace(",", "."));
          return (
            <div key={l.invId} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ flex: 1, fontSize: 14 }}><b>{it?.n}</b><span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>stock {it?.qty} {it?.u}</span></span>
              <input aria-label={`Cantidad de ${it?.n}`} value={l.qty} inputMode="decimal" className="tnum" onChange={(e) => setLines((ls) => ls.map((x) => (x.invId === l.invId ? { ...x, qty: e.target.value } : x)))} style={{ ...inp, width: 84, border: tried && !(q > 0 && it && q <= it.qty) ? "2px solid var(--error-fg)" : "1px solid var(--line)" }} />
              <span style={{ width: 44, fontSize: 13, color: "var(--ink-500)" }}>{it?.u}</span>
              <button type="button" aria-label={`Quitar ${it?.n}`} onClick={() => setLines((ls) => ls.filter((x) => x.invId !== l.invId))} style={{ cursor: "pointer", border: 0, background: "transparent", color: "var(--error-fg)", fontWeight: 700, fontSize: 18, minHeight: 36, fontFamily: "inherit" }}>×</button>
            </div>
          );
        })}
        {free.length > 0 && (
          <select aria-label="Agregar material" value="" onChange={(e) => e.target.value && setLines((ls) => [...ls, { invId: e.target.value, qty: "1" }])} style={inp}>
            <option value="">+ Agregar material usado…</option>
            {free.map((i) => <option key={i.id} value={i.id}>{i.n} · stock {i.qty} {i.u}</option>)}
          </select>
        )}
        {tried && err && <div role="alert" style={{ color: "var(--error-fg)", fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => done(false)} style={btnOutline}>{finish ? "Finalizar sin materiales" : "Cerrar"}</button>
          {lines.length > 0 && <button type="button" onClick={() => done(true)} style={btnPrimary()}>{finish ? "Liquidar y finalizar" : "Liquidar materiales"}</button>}
        </div>
      </div>
    </Modal>
  );
}
