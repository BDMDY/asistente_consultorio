"use client";
import Link from "next/link";
import { useState } from "react";
import { limaHM } from "@/lib/attention";
import { consumeCode } from "@/lib/discounts";
import { useBrand } from "@/lib/brand";
import { MONTHS_LONG, labelLong, labelShort } from "@/lib/dates";
import { paymentsInRange, setVoided, sumLive, totalsByMethod } from "@/lib/finance";
import { useToday } from "@/lib/hooks";
import { type FinItem, modStore, money0, saveMod, uid, useMod } from "@/lib/mod";
import { enqueue } from "@/lib/outbox";
import { patientOf, patientsStore } from "@/lib/patients";
import { PAY_METHODS, type PayMethod, type Payment, addPayment, paymentsStore } from "@/lib/payments";
import { limaDateOf, periodRange } from "@/lib/reports";
import { toast } from "@/lib/toast";
import { DiscountFields, DiscountSummary, useDiscount } from "./common";
import { Actions, ChipField, E, G, ModuleLayout, N, type Row, SheetSub, TextField, W } from "./kit";

type Sel = null | { mode: "new" } | { id: string };
const FILTERS = ["Hoy", "Semana", "Mes", "Año", "Por cobrar"];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const split = (c: string) => { const [a, ...r] = c.split(" · "); return { pac: a, con: r.join(" · ") || c }; };

/**
 * Finanzas: libro de ingresos. Todos los cobros (agenda, fichas, planes, cuotas) figuran aquí con su fecha, hora, comprobante,
 * paciente, concepto y método de pago, y son los mismos que usan los reportes. Las cuentas por cobrar viven en "Por cobrar".
 */
export function Finanzas() {
  const { data: d, pending } = useMod();
  const [payments] = paymentsStore.useStore();
  const today = useToday();
  const [chip, setChip] = useState(2);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);

  const range = !today ? null : chip === 0 ? { from: today, to: today } : chip === 4 ? null : periodRange(today, ([0, 0, 1, 2] as const)[chip] ?? 1);
  const inPeriod = chip === 4 ? [] : paymentsInRange(payments, range);
  const legacy = chip === 3 ? d.fin.filter((f) => f.st === "pagado" && !f.payId) : [];
  const match = (t: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());

  const payRows: Row[] = inPeriod
    .filter((p) => match(`${p.patient} ${p.concept} ${p.no} ${p.method}`))
    .map((p) => ({
      id: `p:${p.id}`, t: `${p.patient} · ${p.concept}`, badge: p.voided ? "Anulado" : money0(p.amount), tone: p.voided ? N : G,
      sub: `${labelShort(limaDateOf(p.at))} · ${limaHM(p.at)} · ${p.no} · ${p.method}${p.voided ? ` · ${money0(p.amount)}` : ""}`,
    }));
  const finRows: Row[] = (chip === 4 ? d.fin.filter((f) => f.st !== "pagado" || !f.payId) : legacy)
    .filter((f) => (chip === 4 ? f.st !== "pagado" : true))
    .filter((f) => match(f.c))
    .map((f) => ({
      id: `f:${f.id}`, t: f.c, badge: money0(f.a), tone: f.st === "pagado" ? G : f.st === "vencido" ? E : f.st === "anulado" ? N : W,
      sub: f.st === "pagado" ? `Cobro anterior · ${f.m}` : `${f.st === "vencido" ? "Vencido" : f.st === "anulado" ? "Anulado" : "Pendiente"}${f.at ? ` · desde ${labelShort(limaDateOf(f.at))}` : ""}`,
    }));
  const rows = [...payRows, ...finRows];

  const collected = sumLive(inPeriod) + legacy.reduce((a, f) => a + f.a, 0);
  const methods = totalsByMethod(inPeriod).filter(([, v]) => v > 0);
  const disc = d.fin.reduce((a, f) => a + (f.disc?.amt ?? 0), 0);
  const label = !today ? "" : chip === 0 ? labelLong(today).replace(/^./, (c) => c.toUpperCase()) : chip === 1 ? `${labelShort(range!.from)} al ${labelShort(range!.to)}` : chip === 2 ? `${MONTHS_LONG[Number(today.slice(5, 7)) - 1].replace(/^./, (c) => c.toUpperCase())} ${today.slice(0, 4)}` : chip === 3 ? `Año ${today.slice(0, 4)}` : "Cuentas por cobrar";
  const curPay = sel && "id" in sel && sel.id.startsWith("p:") ? payments.find((p) => `p:${p.id}` === sel.id) : undefined;
  const curFin = sel && "id" in sel && sel.id.startsWith("f:") ? d.fin.find((f) => `f:${f.id}` === sel.id) : undefined;

  return (
    <ModuleLayout title="Finanzas" sub={`${label}${chip === 4 ? "" : ` · ${inPeriod.filter((p) => !p.voided).length} cobros${methods.length ? ` · ${methods.map(([m, v]) => `${m} ${money0(v)}`).join(" · ")}` : ""}`}${disc ? ` · descuentos ${money0(disc)}` : ""}`}
      kpis={[{ l: chip === 4 ? "Cobrado este mes" : "Cobrado en el periodo", v: money0(chip === 4 && today ? sumLive(paymentsInRange(payments, periodRange(today, 1))) : collected) }, { l: "Por cobrar", v: money0(pending.reduce((a, f) => a + f.a, 0)), c: "var(--warning-fg)" }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Registrar cobro" onCta={() => setSel({ mode: "new" })} rows={rows}
      emptyHint={chip === 4 ? "No hay cuentas por cobrar." : "Aún no hay cobros en este periodo. Los cobros de la agenda, las fichas y los planes aparecen aquí con su fecha."}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? "Registrar cobro" : curPay ? `${curPay.patient} · ${curPay.concept}` : (curFin?.c ?? "")}
      panel={sel && "mode" in sel ? <NewCharge onDone={() => setSel(null)} /> : curPay ? <PaymentDetail key={curPay.id + String(curPay.voided)} p={curPay} onDone={() => setSel(null)} /> : curFin ? <Charge key={curFin.id + curFin.st} rec={curFin} onDone={() => setSel(null)} /> : null} />
  );
}

/** Detalle de un cobro: fecha y hora, comprobante, paciente, concepto y método; ver comprobante, enviarlo o anularlo. */
function PaymentDetail({ p, onDone }: { p: Payment; onDone: () => void }) {
  const brand = useBrand();
  const [patients] = patientsStore.useStore();
  const patient = patientOf(patients, { p: p.patient });
  const when = `${labelLong(limaDateOf(p.at)).replace(/^./, (c) => c.toUpperCase())} · ${limaHM(p.at)}`;
  const same = paymentsStore.get().filter((x) => x.no === p.no && !x.voided);
  function receipt() {
    const w = window.open("", "_blank");
    if (!w) return toast("Permite ventanas emergentes para ver el comprobante");
    const total = same.reduce((n, x) => n + x.amount, 0);
    w.document.write(`<title>Comprobante ${esc(p.no)}</title><body style="font-family:sans-serif;padding:24px"><h2>${esc(brand.name)}</h2><p>Comprobante ${esc(p.no)} · ${esc(when)}</p><p>${esc(p.patient)}</p>${same.map((x) => `<p>${esc(x.concept)} · <b>${money0(x.amount)}</b></p>`).join("")}<p>Pagado con ${esc(p.method)} · Total <b>${money0(total)}</b></p><p style="color:#777;font-size:12px">Comprobante de pago (demo)</p></body>`);
    w.document.close();
  }
  return (
    <>
      <SheetSub sub={`${money0(p.amount)} · ${p.method}`} badge={p.voided ? "Anulado" : "Cobrado"} tone={p.voided ? N : G} />
      <div className="tnum" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.5 }}>
        <span><b>Fecha y hora:</b> {when}</span>
        <span><b>Comprobante:</b> {p.no}{same.length > 1 ? ` (${same.length} tratamientos)` : ""}</span>
        <span><b>Paciente:</b> {p.patient}</span>
        <span><b>Concepto:</b> {p.concept}</span>
        {p.date && <span><b>Referencia:</b> {p.date}</span>}
      </div>
      <Actions items={[
        { t: "Ver comprobante", kind: "p", icon: "file-text", run: receipt },
        { t: "Enviar por WhatsApp", icon: "send", run: () => { enqueue({ kind: "comprobante", channel: "whatsapp", patient: p.patient, text: `Comprobante ${p.no}: ${p.concept} · ${money0(p.amount)}` }); onDone(); toast("Comprobante en cola · se enviará por WhatsApp al conectar la integración"); } },
        p.voided
          ? { t: "Restablecer cobro", icon: "rotate-ccw", run: () => { setVoided(p, false); toast("Cobro restablecido"); onDone(); } }
          : { t: "Anular cobro", kind: "x", icon: "ban", run: () => { setVoided(p, true); toast("Cobro anulado · ya no cuenta en finanzas ni en reportes", () => setVoided(p, false)); onDone(); } },
      ]} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {patient && <Link href={`/intranet/pacientes?id=${patient.id}`} style={{ minHeight: 46, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 12, fontWeight: 700, boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--ink-900)" }}>Ver ficha del paciente</Link>}
        <Link href="/intranet/modulos/reportes" style={{ minHeight: 46, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 12, fontWeight: 700, boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--ink-900)" }}>Ver reportes de ingresos</Link>
      </div>
    </>
  );
}

function NewCharge({ onDone }: { onDone: () => void }) {
  const { data: d } = useMod();
  const [f, setF] = useState({ pac: "", con: "", a: "", m: "Efectivo" as PayMethod, st: "Cobrado" as "Cobrado" | "Pendiente" });
  const base = Number(f.a) || 0;
  const dc = useDiscount(base, d.desc);
  const r = dc.result;
  function save() {
    if (f.pac.trim().length < 3) return toast("Indica el paciente");
    if (f.con.trim().length < 2) return toast("Indica el concepto");
    if (!(base > 0)) return toast("Indica el monto");
    if (r.err) return toast(r.err);
    const cobr = f.st === "Cobrado";
    const con = f.con.trim() + (r.t ? ` (desc. ${r.label} −${money0(r.amt)})` : "");
    const prev = modStore.get();
    if (cobr) {
      addPayment({ patient: f.pac.trim(), concept: con, amount: r.total, method: f.m, date: "" });
      if (r.t) saveMod({ ...prev, desc: consumeCode(prev.desc, r) });
    } else {
      const rec: FinItem = { id: uid(), c: `${f.pac.trim()} · ${f.con.trim()}`, pac: f.pac.trim(), con: f.con.trim(), m: "", a: r.total, st: "pendiente", at: new Date().toISOString(), ...(r.t ? { base, disc: { t: r.t, label: r.label, amt: r.amt } } : {}) };
      saveMod({ ...prev, fin: [rec, ...prev.fin], desc: consumeCode(prev.desc, r) }, "Pendiente registrado" + (r.t ? ` · descuento ${r.label}` : ""), prev);
    }
    if (cobr) toast("Cobro registrado · figura en Finanzas y en Reportes" + (r.t ? ` · descuento ${r.label}` : ""));
    onDone();
  }
  return (
    <>
      <TextField label="Paciente" value={f.pac} onChange={(pac) => setF({ ...f, pac })} />
      <TextField label="Concepto" value={f.con} onChange={(con) => setF({ ...f, con })} />
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
            { t: `Registrar pago · ${money0(r.total)}`, kind: "p", icon: "banknote", run: () => (r.err ? toast(r.err) : (() => { const sp = split(rec.c); const pay = addPayment({ patient: rec.pac ?? sp.pac, concept: (rec.con ?? sp.con) + (r.t ? ` (desc. ${r.label} −${money0(r.amt)})` : ""), amount: r.total, method: m, date: "" }); patch({ st: "pagado", m, a: r.total, payId: pay.id, ...(r.t ? { base: base0, disc: { t: r.t, label: r.label, amt: r.amt } } : {}) }, "Pago registrado · figura en Finanzas y en Reportes" + (r.t ? ` · descuento ${r.label}` : ""), consumeCode(d.desc, r)); })()) },
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
