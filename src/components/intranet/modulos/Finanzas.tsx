"use client";
import { useState } from "react";
import { consumeCode } from "@/lib/discounts";
import { useBrand } from "@/lib/brand";
import { MONTHS_LONG } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { type FinItem, modStore, money0, saveMod, uid, useMod } from "@/lib/mod";
import { enqueue } from "@/lib/outbox";
import { PAY_METHODS, type PayMethod } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { DiscountFields, DiscountSummary, useDiscount } from "./common";
import { Actions, ChipField, E, G, ModuleLayout, N, type Row, SheetSub, TextField, W } from "./kit";

type Sel = null | { mode: "new" } | { id: string };
const FILTERS = ["Todos", "Cobrados", "Pendientes"];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function Finanzas() {
  const { data: d, pending } = useMod();
  const today = useToday();
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const cat = (f: FinItem) => (f.st === "pagado" ? 1 : f.st === "anulado" ? 3 : 2);
  const tone = (f: FinItem) => (f.st === "pagado" ? G : f.st === "vencido" ? E : f.st === "anulado" ? N : W);

  const rows: Row[] = d.fin
    .filter((f) => !chip || cat(f) === chip)
    .filter((f) => !q.trim() || f.c.toLowerCase().includes(q.trim().toLowerCase()))
    .map((f) => ({
      id: f.id, t: f.c, badge: money0(f.a), tone: tone(f),
      sub: f.st === "pagado" ? `Cobrado · ${f.m}${f.disc ? ` · desc. ${f.disc.label} −${money0(f.disc.amt)}` : ""}` : f.st === "vencido" ? "Vencido" : f.st === "anulado" ? "Anulado" : "Pendiente",
    }));
  const paid = d.fin.filter((f) => f.st === "pagado").reduce((a, f) => a + f.a, 0);
  const disc = d.fin.reduce((a, f) => a + (f.disc?.amt ?? 0), 0);
  const month = today ? `${MONTHS_LONG[Number(today.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} ${today.slice(0, 4)}` : "";
  const cur = sel && "id" in sel ? d.fin.find((f) => f.id === sel.id) : undefined;

  return (
    <ModuleLayout title="Finanzas" sub={`${month} · descuentos ${money0(disc)}`}
      kpis={[{ l: "Ingresos del mes", v: money0(paid) }, { l: "Pendiente", v: money0(pending.reduce((a, f) => a + f.a, 0)), c: "var(--warning-fg)" }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Registrar cobro" onCta={() => setSel({ mode: "new" })} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? "Registrar cobro" : (cur?.c ?? "")}
      panel={sel && "mode" in sel ? <NewCharge onDone={() => setSel(null)} /> : cur ? <Charge key={cur.id + cur.st} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function NewCharge({ onDone }: { onDone: () => void }) {
  const { data: d } = useMod();
  const [f, setF] = useState({ c: "", a: "", m: "Efectivo" as PayMethod, st: "Cobrado" as "Cobrado" | "Pendiente" });
  const base = Number(f.a) || 0;
  const dc = useDiscount(base, d.desc);
  const r = dc.result;
  function save() {
    if (!f.c.trim()) return toast("Indica paciente y concepto");
    if (!(base > 0)) return toast("Indica el monto");
    if (r.err) return toast(r.err);
    const cobr = f.st === "Cobrado";
    const rec: FinItem = { id: uid(), c: f.c.trim(), m: cobr ? f.m : "", a: r.total, st: cobr ? "pagado" : "pendiente", ...(r.t ? { base, disc: { t: r.t, label: r.label, amt: r.amt } } : {}) };
    const prev = modStore.get();
    saveMod({ ...prev, fin: [rec, ...prev.fin], desc: consumeCode(prev.desc, r) }, (cobr ? "Cobro registrado" : "Pendiente registrado") + (r.t ? ` · descuento ${r.label}` : ""), prev);
    onDone();
  }
  return (
    <>
      <TextField label="Paciente y concepto" value={f.c} onChange={(c) => setF({ ...f, c })} />
      <TextField label="Monto antes de descuento (S/)" value={f.a} num onChange={(a) => setF({ ...f, a })} />
      <DiscountFields input={dc.input} set={dc.set} desc={d.desc} />
      <ChipField label="Método de pago" value={f.m} options={PAY_METHODS} onChange={(m) => setF({ ...f, m })} />
      <ChipField label="Estado" value={f.st} options={["Cobrado", "Pendiente"] as const} onChange={(st) => setF({ ...f, st })} />
      <DiscountSummary base={base} total={r.total} amt={r.amt} label={r.label} err={r.err} />
      <Actions items={[{ t: `Registrar · ${money0(r.total)}`, kind: "p", icon: "check", run: save }]} />
    </>
  );
}

function Charge({ rec, onDone }: { rec: FinItem; onDone: () => void }) {
  const { data: d } = useMod();
  const brand = useBrand();
  const [m, setM] = useState<PayMethod>("Efectivo");
  const base0 = rec.base ?? rec.a;
  const dc = useDiscount(base0, d.desc);
  const r = dc.result;
  const patch = (p: Partial<FinItem>, msg: string, desc?: typeof d.desc) => {
    const prev = modStore.get();
    saveMod({ ...prev, desc: desc ?? prev.desc, fin: prev.fin.map((x) => (x.id === rec.id ? { ...x, ...p } : x)) }, msg, prev);
    onDone();
  };
  const tone = rec.st === "pagado" ? G : rec.st === "vencido" ? E : rec.st === "anulado" ? N : W;
  const label = rec.st === "pagado" ? `Cobrado · ${rec.m}` : rec.st === "vencido" ? "Vencido" : rec.st === "anulado" ? "Anulado" : "Pendiente";

  function receipt() {
    const w = window.open("", "_blank");
    if (!w) return toast("Permite ventanas emergentes para ver el comprobante");
    w.document.write(`<title>Comprobante</title><body style="font-family:sans-serif;padding:24px"><h2>${esc(brand.name)}</h2><p>${esc(rec.c)}</p><p><b>${money0(rec.a)}</b> · ${esc(rec.m)}</p>${rec.disc ? `<p>Subtotal ${money0(rec.base ?? rec.a)} · Descuento ${esc(rec.disc.label)} −${money0(rec.disc.amt)}</p>` : ""}<p>Gracias por su pago.</p></body>`);
    w.document.close();
  }

  return (
    <>
      <SheetSub sub={`${money0(rec.a)}${rec.m ? ` · ${rec.m}` : ""}`} badge={label} tone={tone} />
      {(rec.st === "pendiente" || rec.st === "vencido") && (
        <>
          <DiscountFields input={dc.input} set={dc.set} desc={d.desc} />
          <ChipField label="Método de pago" value={m} options={PAY_METHODS} onChange={setM} />
          <DiscountSummary base={base0} total={r.total} amt={r.amt} label={r.label} err={r.err} />
          <Actions items={[
            { t: `Registrar pago · ${money0(r.total)}`, kind: "p", icon: "banknote", run: () => (r.err ? toast(r.err) : patch({ st: "pagado", m, a: r.total, ...(r.t ? { base: base0, disc: { t: r.t, label: r.label, amt: r.amt } } : {}) }, "Pago registrado" + (r.t ? ` · descuento ${r.label}` : ""), consumeCode(d.desc, r))) },
            { t: "Recordar por WhatsApp", icon: "message-circle", run: () => { enqueue({ kind: "cobranza", channel: "whatsapp", patient: rec.c, text: `Recordatorio de pago: ${rec.c} · ${money0(rec.a)}` }); onDone(); toast("Recordatorio en cola · se enviará por WhatsApp al conectar la integración"); } },
            { t: "Anular", kind: "x", icon: "ban", run: () => patch({ st: "anulado" }, "Registro anulado") },
          ]} />
        </>
      )}
      {rec.st === "pagado" && (
        <Actions items={[
          { t: "Ver comprobante", kind: "p", icon: "file-text", run: receipt },
          { t: "Enviar por WhatsApp", icon: "send", run: () => { enqueue({ kind: "comprobante", channel: "whatsapp", patient: rec.c, text: `Comprobante: ${rec.c} · ${money0(rec.a)}` }); onDone(); toast("Comprobante en cola · se enviará por WhatsApp al conectar la integración"); } },
          { t: "Anular cobro", kind: "x", icon: "ban", run: () => patch({ st: "anulado" }, "Cobro anulado") },
        ]} />
      )}
      {rec.st === "anulado" && <Actions items={[{ t: "Reactivar como pendiente", kind: "p", icon: "rotate-ccw", run: () => patch({ st: "pendiente" }, "Reactivado") }]} />}
    </>
  );
}
