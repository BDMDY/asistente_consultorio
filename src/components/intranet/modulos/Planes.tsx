"use client";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useState } from "react";
import { type PlanItem, addItems, applyLines, itemBalance, planItems, plansStore, removeItem, sessionPrice, payItem } from "@/lib/clinical";
import { todayISO } from "@/lib/dates";
import { consumeCode } from "@/lib/discounts";
import { type Plan, modStore, money0, payInstallment, saveMod, uid, useMod } from "@/lib/mod";
import { parsePrice, useMedia, activeServices } from "@/lib/media";
import { patientsStore } from "@/lib/patients";
import { PAY_METHODS, type PayMethod, addPayment } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { DiscountFields, DiscountSummary, useDiscount } from "./common";
import { Actions, ChipField, G, ListField, ModuleLayout, N, type Row, SheetSub, TextField, W } from "./kit";

type Sel = null | { mode: "new" } | { id: string };
const FILTERS = ["Todos", "En curso", "Completados"];

/**
 * Planes de tratamiento: cada servicio o tratamiento tiene su propio plan de sesiones (con su avance y sus pagos).
 * Los planes de pago en cuotas creados antes (un plan con varios servicios) se siguen mostrando y cobrando como "plan de pago".
 */
export function Planes() {
  const { data: d } = useMod();
  const [plans] = plansStore.useStore();
  const [patients] = patientsStore.useStore();
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);

  const entries = patients.flatMap((p) => planItems(plans[p.id]).map((it) => ({ pid: p.id, pac: p.name, it })));
  const itemDone = (it: PlanItem) => it.done >= it.total;
  const legacyDone = (p: Plan) => p.paid >= p.n;
  const match = (t: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());

  const rows: Row[] = [
    ...entries
      .filter((e) => !chip || (chip === 2 ? itemDone(e.it) : !itemDone(e.it)))
      .filter((e) => match(`${e.pac} ${e.it.name}`))
      .map((e): Row => {
        const pc = Math.round((e.it.done / Math.max(1, e.it.total)) * 100);
        return { id: `i:${e.pid}:${e.it.id}`, t: `${e.pac} · ${e.it.name}`, sub: `Sesión ${e.it.done} de ${e.it.total} · pagado ${money0(e.it.paid ?? 0)} de ${money0(e.it.price)}${itemBalance(e.it) > 0 ? ` · saldo ${money0(itemBalance(e.it))}` : ""}`, badge: itemDone(e.it) ? "Completo" : `${pc}%`, tone: itemDone(e.it) ? G : pc < 30 ? N : W, progress: pc };
      }),
    ...d.planes
      .filter((p) => !chip || (chip === 2 ? legacyDone(p) : !legacyDone(p)))
      .filter((p) => match(`${p.pac} ${p.trat}`))
      .map((p): Row => {
        const pc = Math.round((p.paid / p.n) * 100);
        return { id: `l:${p.id}`, t: `${p.pac} · ${p.trat}`, sub: `Plan de pago · cuota ${p.paid} de ${p.n} · ${money0(p.cuota)}${p.disc ? ` · desc. ${p.disc.label} −${money0(p.disc.amt)}` : ""}`, badge: legacyDone(p) ? "Completo" : `${pc}%`, tone: legacyDone(p) ? G : pc < 30 ? N : W, progress: pc };
      }),
  ];
  const curItem = sel && "id" in sel && sel.id.startsWith("i:") ? entries.find((e) => `i:${e.pid}:${e.it.id}` === sel.id) : undefined;
  const curLegacy = sel && "id" in sel && sel.id.startsWith("l:") ? d.planes.find((p) => `l:${p.id}` === sel.id) : undefined;
  const open = entries.filter((e) => !itemDone(e.it)).length + d.planes.filter((p) => !legacyDone(p)).length;
  const toCollect = entries.reduce((a, e) => a + itemBalance(e.it), 0) + d.planes.reduce((a, p) => a + (p.n - p.paid) * p.cuota, 0);

  return (
    <ModuleLayout title="Planes de tratamiento" sub={`${entries.length + d.planes.length} tratamientos`}
      kpis={[{ l: "En curso", v: String(open) }, { l: "Por cobrar", v: money0(toCollect) }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nuevo plan" onCta={() => setSel({ mode: "new" })} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? "Nuevo plan de tratamiento" : (curItem ? `${curItem.pac} · ${curItem.it.name}` : (curLegacy?.pac ?? ""))}
      panel={sel && "mode" in sel ? <NewPlan onDone={() => setSel(null)} /> : curItem ? <ItemDetail key={curItem.it.id + curItem.it.done + (curItem.it.paid ?? 0)} pid={curItem.pid} pac={curItem.pac} item={curItem.it} onDone={() => setSel(null)} /> : curLegacy ? <PlanDetail key={curLegacy.id + curLegacy.paid} rec={curLegacy} onDone={() => setSel(null)} /> : null} />
  );
}

/** Un plan de sesiones por cada servicio elegido: sesiones previstas y precio total de cada uno. */
function NewPlan({ onDone }: { onDone: () => void }) {
  const { data: d } = useMod();
  const media = useMedia();
  const [patients] = patientsStore.useStore();
  const services = activeServices(media);
  const [pac, setPac] = useState<string[]>([]);
  const [svs, setSvs] = useState<string[]>([]);
  const [cfg, setCfg] = useState<Record<string, { n: string; p: string | null }>>({});
  const chosen = services.filter((s) => svs.includes(s.name));
  const nOf = (name: string) => Math.max(1, Math.round(Number(cfg[name]?.n ?? "1")) || 1);
  const priceOf = (name: string) => {
    const manual = cfg[name]?.p;
    if (manual !== null && manual !== undefined) return Number(manual) || 0;
    const sv = chosen.find((x) => x.name === name);
    return (sv ? parsePrice(sv.price) || 0 : 0) * nOf(name);
  };
  const base = chosen.reduce((a, s) => a + priceOf(s.name), 0);
  const dc = useDiscount(base, d.desc);
  const r = dc.result;
  const setCfgOf = (name: string, p: Partial<{ n: string; p: string | null }>) => setCfg((c) => ({ ...c, [name]: { n: c[name]?.n ?? "1", p: c[name]?.p ?? null, ...p } }));

  function create() {
    const patient = patients.find((x) => x.name === pac[0]);
    if (!patient) return toast("Indica el paciente");
    if (!chosen.length) return toast("Elige al menos un servicio");
    if (chosen.some((s) => !(priceOf(s.name) > 0))) return toast("Cada tratamiento necesita un precio mayor a 0");
    if (r.err) return toast(r.err);
    const k = base > 0 ? r.total / base : 1;
    const items: PlanItem[] = chosen.map((s) => ({ id: uid(), name: s.name, total: nOf(s.name), done: 0, price: Math.round(priceOf(s.name) * k * 100) / 100, paid: 0, at: todayISO() }));
    plansStore.update((all) => ({ ...all, [patient.id]: addItems(all[patient.id], items) }));
    if (r.t) { const prev = modStore.get(); saveMod({ ...prev, desc: consumeCode(prev.desc, r) }); }
    toast(`${items.length === 1 ? "Plan creado" : `${items.length} planes creados`} para ${patient.name}${r.t ? ` · descuento ${r.label}` : ""}`);
    onDone();
  }

  return (
    <>
      <SheetSub sub="Cada servicio tiene su propio plan de sesiones. Más tratamientos se pueden agregar después, por ejemplo tras la evaluación odontológica." />
      <ListField label="Paciente (busca por DNI o nombre)" value={pac} onChange={setPac} minChars={3} maxShown={6} hint="Escribe al menos 3 dígitos del DNI o parte del nombre"
        items={patients.map((p) => ({ v: p.name, t: p.name, r: `DNI ${p.dni}` }))} />
      <ListField label="Servicios o tratamientos" multi value={svs} onChange={setSvs} info={`${chosen.length} seleccionado(s)`}
        items={services.map((s) => ({ v: s.name, t: s.name, r: parsePrice(s.price) > 0 ? `${money0(parsePrice(s.price))} / sesión` : "Gratis" }))} />
      {chosen.map((s) => (
        <div key={s.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)" }}>
          <b style={{ fontSize: 14 }}>{s.name}</b>
          <TextField label="Número de sesiones" value={cfg[s.name]?.n ?? "1"} num onChange={(n) => setCfgOf(s.name, { n })} />
          <TextField label="Precio total del tratamiento (S/) · puedes modificarlo" value={cfg[s.name]?.p ?? String(priceOf(s.name))} num onChange={(p) => setCfgOf(s.name, { p })} />
          <SheetSub sub={`${money0(Math.round((priceOf(s.name) / nOf(s.name)) * 100) / 100)} por sesión`} />
        </div>
      ))}
      <DiscountFields input={dc.input} set={dc.set} desc={d.desc} />
      <DiscountSummary base={base} total={r.total} amt={r.amt} label={r.label} err={r.err} />
      <Actions items={[{ t: chosen.length > 1 ? `Crear ${chosen.length} planes · ${money0(r.total)}` : `Crear plan · ${money0(r.total)}`, kind: "p", icon: "check", run: create }]} />
    </>
  );
}

/** Detalle de un tratamiento: registrar la sesión realizada y/o su pago. */
function ItemDetail({ pid, pac, item, onDone }: { pid: number; pac: string; item: PlanItem; onDone: () => void }) {
  const bal = itemBalance(item);
  const [amount, setAmount] = useState(String(bal > 0 ? Math.min(sessionPrice(item), bal) : 0));
  const [method, setMethod] = useState<PayMethod>("Efectivo");
  const amt = Number(amount) || 0;
  const finished = item.done >= item.total;
  const pc = Math.round((item.done / Math.max(1, item.total)) * 100);
  const patch = (fn: (plan: NonNullable<ReturnType<typeof plansStore.get>[number]>) => ReturnType<typeof applyLines> | undefined) =>
    plansStore.update((all) => { const cur = all[pid]; if (!cur) return all; const next = fn(cur); const out = { ...all }; if (next) out[pid] = next; else delete out[pid]; return out; });
  const charge = (withSession: boolean) => {
    if (withSession && finished) return toast("Las sesiones de este tratamiento ya están completas");
    if (amt > 0) {
      addPayment({ patient: pac, concept: item.name, amount: amt, method, date: todayISO() });
      // También queda en Finanzas, como los pagos de cuota de los planes de pago.
      const prev = modStore.get();
      saveMod({ ...prev, fin: [{ id: uid(), c: `${pac} · ${item.name}${withSession ? ` · sesión ${Math.min(item.total, item.done + 1)}` : ""}`, m: method, a: amt, st: "pagado" }, ...prev.fin] });
    }
    patch((pl) => (withSession ? applyLines(pl, [{ planItem: item.id, amount: amt }]) : payItem(pl, item.id, amt)));
    toast(withSession ? `Sesión ${Math.min(item.total, item.done + 1)} de ${item.total} registrada${amt > 0 ? ` · cobro ${money0(amt)}` : ""}` : `Pago registrado · ${money0(amt)}`);
    onDone();
  };
  return (
    <>
      <SheetSub sub={`Sesión ${item.done} de ${item.total} · pagado ${money0(item.paid ?? 0)} de ${money0(item.price)} · saldo ${money0(bal)}`} badge={finished ? "Completo" : `${pc}%`} tone={finished ? G : pc < 30 ? N : W} />
      <TextField label="Monto a cobrar (S/)" value={amount} num onChange={setAmount} />
      <ChipField label="Método de pago" value={method} options={PAY_METHODS} onChange={setMethod} />
      <Actions items={[
        { t: `Registrar sesión ${Math.min(item.total, item.done + 1)} y cobro`, kind: "p", icon: "check", off: finished, run: () => charge(true) },
        { t: "Solo registrar la sesión (sin cobro)", icon: "check", off: finished, run: () => { patch((pl) => applyLines(pl, [{ planItem: item.id, amount: 0 }])); toast(`Sesión ${item.done + 1} de ${item.total} registrada`); onDone(); } },
        { t: "Solo registrar un pago", icon: "banknote", off: !(amt > 0), run: () => charge(false) },
      ]} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <LinkBtn href={`/intranet/pacientes?id=${pid}`} icon="user">Ver ficha del paciente</LinkBtn>
        <LinkBtn href={`/intranet/agenda?nueva=${encodeURIComponent(pac)}&serie=1`} icon="calendar-plus">Agendar sesiones</LinkBtn>
      </div>
      <Actions items={[{ t: "Quitar este tratamiento del plan", kind: "x", icon: "trash-2", run: () => { patch((pl) => removeItem(pl, item.id)); toast("Tratamiento quitado del plan"); onDone(); } }]} />
    </>
  );
}

function PlanDetail({ rec, onDone }: { rec: Plan; onDone: () => void }) {
  const [cuotaStr, setCuotaStr] = useState(String(rec.cuota));
  const [patients] = patientsStore.useStore();
  const done = rec.paid >= rec.n;
  const cuota = Number(cuotaStr) || rec.cuota;
  const pc = Math.round((rec.paid / rec.n) * 100);
  const patient = patients.find((p) => p.name.toLowerCase() === rec.pac.toLowerCase());
  const patchPlan = (p: Partial<Plan>, msg: string) => {
    const prev = modStore.get();
    saveMod({ ...prev, planes: prev.planes.map((x) => (x.id === rec.id ? { ...x, ...p } : x)) }, msg, prev);
    onDone();
  };
  return (
    <>
      <SheetSub sub={`${rec.trat} · cuota ${rec.paid} de ${rec.n} · saldo ${money0((rec.n - rec.paid) * rec.cuota)}${rec.disc ? ` · descuento ${rec.disc.label} −${money0(rec.disc.amt)} sobre ${money0(rec.base ?? 0)}` : ""}`} badge={done ? "Completo" : `${pc}%`} tone={done ? G : pc < 30 ? N : W} />
      <TextField label="Monto por cuota (S/)" value={cuotaStr} num onChange={setCuotaStr} />
      <Actions items={[
        { t: `Registrar pago de cuota ${rec.paid + 1}`, kind: "p", icon: "banknote", off: done, run: () => {
          if (done) return toast("No disponible en este estado");
          payInstallment(rec.id, cuota);
          onDone();
        } },
        { t: "Guardar nueva cuota", icon: "save", run: () => patchPlan({ cuota }, "Cuota actualizada") },
      ]} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <LinkBtn href={patient ? `/intranet/pacientes?id=${patient.id}` : "/intranet/pacientes"} icon="user">Ver ficha del paciente</LinkBtn>
        <LinkBtn href={`/intranet/agenda?nueva=${encodeURIComponent(rec.pac)}&serie=1`} icon="calendar-plus">Agendar siguiente cita</LinkBtn>
      </div>
      <Actions items={[{ t: "Eliminar plan", kind: "x", icon: "trash-2", run: () => { const prev = modStore.get(); saveMod({ ...prev, planes: prev.planes.filter((x) => x.id !== rec.id) }, "Plan eliminado", prev); onDone(); } }]} />
    </>
  );
}

export function LinkBtn({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ cursor: "pointer", minHeight: 50, borderRadius: 12, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", fontWeight: 700, fontSize: 15, background: "var(--surface)", color: "var(--ink-900)", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <Icon name={icon} />{children}
    </Link>
  );
}
