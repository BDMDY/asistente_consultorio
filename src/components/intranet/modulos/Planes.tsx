"use client";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useState } from "react";
import { consumeCode } from "@/lib/discounts";
import { type Plan, modStore, money0, payInstallment, saveMod, uid, useMod } from "@/lib/mod";
import { parsePrice, useMedia, activeServices } from "@/lib/media";
import { patientsStore } from "@/lib/patients";
import { toast } from "@/lib/toast";
import { DiscountFields, DiscountSummary, useDiscount } from "./common";
import { Actions, G, ListField, ModuleLayout, N, type Row, SheetSub, TextField, W } from "./kit";

type Sel = null | { mode: "new" } | { id: string };
const FILTERS = ["Todos", "En curso", "Completados"];

export function Planes() {
  const { data: d } = useMod();
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const done = (p: Plan) => p.paid >= p.n;
  const rows: Row[] = d.planes
    .filter((p) => !chip || (chip === 2 ? done(p) : !done(p)))
    .filter((p) => !q.trim() || `${p.pac} ${p.trat}`.toLowerCase().includes(q.trim().toLowerCase()))
    .map((p) => {
      const pc = Math.round((p.paid / p.n) * 100);
      return { id: p.id, t: `${p.pac} · ${p.trat}`, sub: `Cuota ${p.paid} de ${p.n} · ${money0(p.cuota)}${p.disc ? ` · desc. ${p.disc.label} −${money0(p.disc.amt)}` : ""}`, badge: done(p) ? "Completo" : `${pc}%`, tone: done(p) ? G : pc < 30 ? N : W, progress: pc };
    });
  const cur = sel && "id" in sel ? d.planes.find((p) => p.id === sel.id) : undefined;

  return (
    <ModuleLayout title="Planes de tratamiento" sub={`${d.planes.length} planes`}
      kpis={[{ l: "En curso", v: String(d.planes.filter((p) => !done(p)).length) }, { l: "Por cobrar", v: money0(d.planes.reduce((a, p) => a + (p.n - p.paid) * p.cuota, 0)) }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nuevo plan" onCta={() => setSel({ mode: "new" })} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? "Nuevo plan" : (cur?.pac ?? "")}
      panel={sel && "mode" in sel ? <NewPlan onDone={() => setSel(null)} /> : cur ? <PlanDetail key={cur.id + cur.paid} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function NewPlan({ onDone }: { onDone: () => void }) {
  const { data: d } = useMod();
  const media = useMedia();
  const [patients] = patientsStore.useStore();
  const services = activeServices(media);
  const [pac, setPac] = useState<string[]>([]);
  const [svs, setSvs] = useState<string[]>([]);
  const [n, setN] = useState("12");
  const [totalOv, setTotalOv] = useState<{ key: string; v: string } | null>(null);
  const chosen = services.filter((s) => svs.includes(s.name));
  const sum = chosen.reduce((a, s) => a + (parsePrice(s.price) || 0), 0);
  const key = svs.join(",");
  const total = Number(totalOv && totalOv.key === key ? totalOv.v : sum) || 0;
  const nn = Math.max(1, Number(n) || 12);
  const dc = useDiscount(total, d.desc);
  const r = dc.result;
  const cuota = Math.round((r.total / nn) * 100) / 100;

  function create() {
    if (!pac[0]) return toast("Indica el paciente");
    if (!chosen.length) return toast("Elige al menos un servicio");
    if (!(total > 0)) return toast("El total debe ser mayor a 0");
    if (r.err) return toast(r.err);
    const rec: Plan = { id: uid(), pac: pac[0], trat: chosen.map((s) => s.name).join(" + "), svcs: chosen.map((s) => s.name), n: nn, paid: 0, cuota, ...(r.t ? { base: total, disc: { t: r.t, label: r.label, amt: r.amt } } : {}) };
    const prev = modStore.get();
    saveMod({ ...prev, planes: [rec, ...prev.planes], desc: consumeCode(prev.desc, r) }, `Plan creado para ${pac[0]}${r.t ? ` · descuento ${r.label}` : ""}`, prev);
    onDone();
  }

  return (
    <>
      <ListField label="Paciente (busca por DNI o nombre)" value={pac} onChange={setPac} minChars={3} maxShown={6} hint="Escribe al menos 3 dígitos del DNI o parte del nombre"
        items={patients.map((p) => ({ v: p.name, t: p.name, r: `DNI ${p.dni}` }))} />
      <ListField label="Servicios del tratamiento" multi value={svs} onChange={setSvs} info={`${chosen.length} seleccionado(s) · suma ${money0(sum)}`}
        items={services.map((s) => ({ v: s.name, t: s.name, r: parsePrice(s.price) > 0 ? money0(parsePrice(s.price)) : "Gratis" }))} />
      <TextField label="Total del tratamiento (S/) · puedes modificarlo" value={totalOv && totalOv.key === key ? totalOv.v : String(sum)} num onChange={(v) => setTotalOv({ key, v })} />
      <TextField label="Número de sesiones (cuotas)" value={n} num onChange={setN} />
      <DiscountFields input={dc.input} set={dc.set} desc={d.desc} />
      <DiscountSummary base={total} total={r.total} amt={r.amt} label={r.label} err={r.err} />
      <SheetSub sub={`${nn} cuotas de ${money0(cuota)}`} />
      <Actions items={[{ t: `Crear plan · ${nn} × ${money0(cuota)}`, kind: "p", icon: "check", run: create }]} />
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
