"use client";
import { useState } from "react";
import { type InvItem, modStore, saveMod, uid, useMod } from "@/lib/mod";
import { diffDays } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { enqueue } from "@/lib/outbox";
import { toast } from "@/lib/toast";
import { nextMatCode } from "@/lib/bulk-materials";
import { BulkMaterials } from "./BulkMaterials";
import { Actions, ChipField, E, G, ModuleLayout, type Row, TextField, SheetSub, W } from "./kit";

const UNITS = ["unid.", "cajas", "paquetes", "frascos", "pares", "g", "kg", "ml", "L"] as const;
const FILTERS = ["Todos", "Stock bajo", "Por vencer"];
type Sel = null | { mode: "new" } | { mode: "bulk" } | { id: string };

export function Inventario() {
  const { data: d } = useMod();
  const today = useToday();
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const soon = (v: string) => !!v && !!today && diffDays(v, today) < 45;
  const status = (i: InvItem) => ({ low: i.qty < i.min, soon: soon(i.venc) });

  const rows: Row[] = d.inv
    .filter((i) => !chip || (chip === 1 ? status(i).low : status(i).soon))
    .filter((i) => !q.trim() || `${i.n} ${i.code ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .map((i) => {
      const st = status(i);
      return { id: i.id, t: i.n, sub: `${i.code ? i.code + " · " : ""}Stock ${i.qty} ${i.u} · mínimo ${i.min} ${i.u}${i.venc ? ` · vence ${i.venc}` : ""}`, badge: st.low ? "Bajo" : st.soon ? "Por vencer" : "OK", tone: st.low ? E : st.soon ? W : G };
    });
  const cur = sel && "id" in sel ? d.inv.find((i) => i.id === sel.id) : undefined;

  return (
    <ModuleLayout title="Inventario" sub={`${d.inv.length} productos`} kpis={[{ l: "Stock bajo", v: String(d.inv.filter((i) => status(i).low).length), c: "var(--error-fg)" }, { l: "Por vencer", v: String(d.inv.filter((i) => status(i).soon).length), c: "var(--warning-fg)" }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nuevo producto" onCta={() => setSel({ mode: "new" })} extra={{ label: "Carga masiva", icon: "upload", onClick: () => setSel({ mode: "bulk" }) }} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? (sel.mode === "bulk" ? "Carga masiva de materiales" : "Nuevo producto") : (cur?.n ?? "")}
      panel={sel && "mode" in sel ? (sel.mode === "bulk" ? <BulkMaterials onDone={() => setSel(null)} /> : <NewProduct onDone={() => setSel(null)} />) : cur ? <Product key={cur.id + cur.qty} rec={cur} soonFn={soon} onDone={() => setSel(null)} /> : null} />
  );
}

function NewProduct({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ n: "", u: "unid." as (typeof UNITS)[number], qty: "0", min: "5", venc: "" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <>
      <TextField label="Producto" value={f.n} onChange={(v) => set({ n: v })} />
      <ChipField label="Unidad de medida" value={f.u} options={UNITS} onChange={(u) => set({ u })} />
      <TextField label={`Cantidad inicial (${f.u})`} value={f.qty} num onChange={(v) => set({ qty: v })} />
      <TextField label={`Stock mínimo (${f.u})`} value={f.min} num onChange={(v) => set({ min: v })} />
      <TextField label="Vencimiento (opcional)" type="date" value={f.venc} onChange={(v) => set({ venc: v })} />
      <Actions items={[{ t: "Guardar producto", kind: "p", icon: "check", run: () => {
        if (!f.n.trim()) return toast("Indica el nombre");
        const prev = modStore.get();
        saveMod({ ...prev, inv: [{ id: uid(), code: nextMatCode(prev.inv), n: f.n.trim(), u: f.u, qty: Number(f.qty) || 0, min: Number(f.min) || 5, venc: f.venc }, ...prev.inv] }, "Producto agregado", prev);
        onDone();
      } }]} />
    </>
  );
}

function Product({ rec, soonFn, onDone }: { rec: InvItem; soonFn: (v: string) => boolean; onDone: () => void }) {
  const [f, setF] = useState({ delta: "1", min: String(rec.min), u: rec.u as (typeof UNITS)[number] });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const dl = Math.max(1, Number(f.delta) || 1);
  const low = rec.qty < rec.min, soon = soonFn(rec.venc);
  const uses = (modStore.get().mats ?? []).filter((m) => m.lines.some((l) => l.invId === rec.id));
  const patch = (p: Partial<InvItem>, msg: string) => {
    const prev = modStore.get();
    saveMod({ ...prev, inv: prev.inv.map((i) => (i.id === rec.id ? { ...i, ...p } : i)) }, msg, prev);
    onDone();
  };
  const base = { min: Number(f.min) || rec.min, u: f.u };
  return (
    <>
      <SheetSub sub={`Stock ${rec.qty} ${rec.u} · mínimo ${rec.min} ${rec.u}${rec.venc ? ` · vence ${rec.venc}` : ""}`} badge={low ? "Bajo" : soon ? "Por vencer" : "OK"} tone={low ? E : soon ? W : G} />
      {uses.length > 0 && (
        <div className="tnum" style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.6 }}>
          <b style={{ color: "var(--ink-700)" }}>Últimos consumos en atenciones</b>
          {uses.slice(0, 5).map((m) => <div key={m.id}>{m.at.slice(0, 10)} · {m.patient} · −{m.lines.find((l) => l.invId === rec.id)!.qty} {rec.u}</div>)}
        </div>
      )}
      <TextField label={`Cantidad del movimiento (${f.u})`} value={f.delta} num onChange={(v) => set({ delta: v })} />
      <TextField label={`Stock mínimo (${f.u})`} value={f.min} num onChange={(v) => set({ min: v })} />
      <ChipField label="Unidad de medida" value={f.u} options={UNITS} onChange={(u) => set({ u })} />
      <Actions items={[
        { t: `Registrar entrada (+${dl})`, kind: "p", icon: "arrow-down-to-line", run: () => patch({ ...base, qty: rec.qty + dl }, `Entrada registrada · stock ${rec.qty + dl} ${f.u}`) },
        { t: `Registrar salida (−${dl})`, icon: "arrow-up-from-line", run: () => (dl > rec.qty ? toast(`No hay tanto stock (${rec.qty})`) : patch({ ...base, qty: rec.qty - dl }, `Salida registrada · stock ${rec.qty - dl} ${f.u}`)) },
        { t: "Guardar mínimo y unidad", icon: "save", run: () => patch(base, "Producto actualizado") },
        { t: "Pedir a proveedor", icon: "send", run: () => { enqueue({ kind: "pedido", channel: "whatsapp", patient: "Proveedor", text: `Pedido de reposición: ${rec.n}` }); onDone(); toast(`Pedido de ${rec.n} en cola · se enviará por WhatsApp al conectar la integración`); } },
        { t: "Eliminar producto", kind: "x", icon: "trash-2", run: () => { const prev = modStore.get(); saveMod({ ...prev, inv: prev.inv.filter((i) => i.id !== rec.id) }, "Producto eliminado", prev); onDone(); } },
      ]} />
    </>
  );
}
