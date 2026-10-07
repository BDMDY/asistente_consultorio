"use client";
import { useState } from "react";
import { type Msg, type MsgSeg, type MsgStatus, modStore, saveMod, uid, useMod } from "@/lib/mod";
import { enqueue } from "@/lib/outbox";
import { LINKS, SEG_DEFAULT, SEG_LABEL, type SegType, demoPool, linkUrl, segCount, segLabel, segWarning } from "@/lib/segments";
import { toast } from "@/lib/toast";
import { Actions, AreaField, ChipField, E, G, ListField, ModuleLayout, N, type Row, SheetSub, TextField, W } from "./kit";

type Sel = null | { mode: "new" } | { id: string };
const FILTERS = ["Todas", "Activas", "Borradores"];
const SEG_NAMES = Object.keys(SEG_LABEL) as SegType[];
const RANGE_LABELS: Record<Exclude<SegType, "Todos">, [string, string?]> = {
  Inactivos: ["Sin visita hace al menos (meses)"], Edad: ["Edad desde (años)", "Edad hasta (años)"],
  Inconclusos: ["Última sesión hace (meses) desde", "Última sesión hace (meses) hasta"], Citas: ["Cita en los próximos (días) desde", "Cita en los próximos (días) hasta"],
};
const POOL = demoPool();
const segOf = (m: Msg): MsgSeg => m.seg ?? (m.aud === "Pacientes con cita" ? { t: "Citas", a: 0, b: 2 } : { t: "Todos", a: 0, b: 0 });

export function Mensajes() {
  const { data: d } = useMod();
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const cat = (m: Msg) => (m.st === "activa" ? 1 : m.st === "borrador" ? 2 : 0);
  const rows: Row[] = d.msg
    .filter((m) => !chip || cat(m) === chip)
    .filter((m) => !q.trim() || m.n.toLowerCase().includes(q.trim().toLowerCase()))
    .map((m) => ({
      id: m.id, t: m.n,
      sub: `${segLabel(segOf(m))}${m.link && m.link !== "Sin enlace" ? ` · enlace: ${m.link.toLowerCase()}` : ""}${m.sent ? ` · ${m.sent} envíos` : ""}`,
      badge: m.st === "activa" ? "Activa" : m.st === "pausada" ? "Pausada" : "Borrador", tone: m.st === "activa" ? G : m.st === "pausada" ? W : N,
    }));
  const cur = sel && "id" in sel ? d.msg.find((m) => m.id === sel.id) : undefined;
  return (
    <ModuleLayout title="Mensajes y campañas" sub="WhatsApp y correo" kpis={[{ l: "Enviados (mes)", v: String(412 + d.sent) }, { l: "Campañas activas", v: String(d.msg.filter((m) => m.st === "activa").length) }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nueva campaña" onCta={() => setSel({ mode: "new" })} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={sel && "mode" in sel ? "Nueva campaña" : (cur?.n ?? "")}
      panel={sel && "mode" in sel ? <CampaignForm key="new" onDone={() => setSel(null)} /> : cur ? <CampaignForm key={cur.id} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function CampaignForm({ rec, onDone }: { rec?: Msg; onDone: () => void }) {
  const { data: d } = useMod();
  const initSeg = rec ? segOf(rec) : { t: "Todos" as SegType, a: 0, b: 0 };
  const [name, setName] = useState(rec?.n ?? "");
  const [seg, setSeg] = useState<MsgSeg>(initSeg);
  const [link, setLink] = useState(rec?.link ?? "Sin enlace");
  const [promo, setPromo] = useState(rec?.lp ?? "");
  const [txt, setTxt] = useState(rec?.txt ?? "");
  const base = typeof window === "undefined" ? "" : window.location.origin;
  const url = linkUrl(link, promo, base);
  const cnt = segCount(POOL, seg);
  const warn = segWarning(link, seg);
  const full = (txt.trim() + (url ? " " + url : "")).trim();

  const pickSeg = (label: string) => {
    const t = SEG_NAMES.find((k) => SEG_LABEL[k] === label) ?? "Todos";
    const [a, b] = t === "Todos" ? [0, 0] : SEG_DEFAULT[t];
    setSeg({ t, a, b });
  };
  const ranges = seg.t === "Todos" ? [] : RANGE_LABELS[seg.t];

  const build = (st: MsgStatus, sent: number): Msg => ({ id: rec?.id ?? uid(), n: name.trim(), seg, aud: segLabel(seg), link, lp: promo, txt: txt.trim(), st, sent });
  function validate(): boolean {
    if (!name.trim()) return (toast("Indica el nombre"), false);
    if (!txt.trim()) return (toast("Escribe el mensaje"), false);
    if (warn) return (toast(warn), false);
    return true;
  }
  function commit(next: Msg, msg: string, sentNow = 0) {
    const prev = modStore.get();
    const list = rec ? prev.msg.map((x) => (x.id === rec.id ? next : x)) : [next, ...prev.msg];
    saveMod({ ...prev, sent: prev.sent + sentNow, msg: list }, msg, prev);
    onDone();
  }
  function sendNow() {
    if (!validate()) return;
    const st: MsgStatus = rec ? (rec.st === "borrador" ? "activa" : rec.st) : "activa";
    enqueue({ kind: "campana", channel: "whatsapp", patient: `Audiencia · ${cnt} pacientes`, text: full });
    commit(build(st, (rec?.sent ?? 0) + cnt), `En cola para ${cnt} pacientes${url ? " · con enlace" : ""} · se enviará por WhatsApp al conectar la integración`, cnt);
  }

  return (
    <>
      <TextField label="Nombre de la campaña" value={name} onChange={setName} />
      <ChipField label="Audiencia" value={SEG_LABEL[seg.t]} options={SEG_NAMES.map((k) => SEG_LABEL[k])} onChange={pickSeg} />
      {ranges.map((l, i) => l && <TextField key={l} label={l} num value={i ? seg.b : seg.a} onChange={(v) => setSeg(i ? { ...seg, b: Number(v) || 0 } : { ...seg, a: Number(v) || 0 })} />)}
      <ChipField label="Enlace al sitio en el mensaje" value={link as (typeof LINKS)[number]} options={LINKS} onChange={setLink} />
      {link === "Promoción" && <ListField label="Código promocional" value={promo ? [promo] : []} onChange={(v) => setPromo(v[0] ?? "")} items={d.desc.codes.filter((x) => x.on).map((x) => ({ v: x.code, t: x.code, r: x.type === "%" ? `${x.val}%` : `S/ ${x.val}` }))} />}
      <AreaField label="Mensaje (usa {nombre} y {hora})" value={txt} onChange={setTxt} />
      <SheetSub sub={full || "Escribe el mensaje…"} badge={warn || `Alcance: ${cnt} pacientes`} tone={warn ? E : G} />
      <Actions items={[
        { t: `Enviar ahora a ${cnt} pacientes`, kind: "p", icon: "send", run: sendNow },
        { t: rec ? "Guardar cambios" : "Guardar como borrador", icon: "save", run: () => { if (!validate()) return; commit(build(rec ? rec.st : "borrador", rec?.sent ?? 0), rec ? "Campaña guardada" : "Borrador guardado"); } },
        ...(rec ? [
          { t: rec.st === "activa" ? "Pausar campaña" : "Activar campaña", icon: (rec.st === "activa" ? "pause" : "play") as "pause" | "play", run: () => commit(build(rec.st === "activa" ? "pausada" : "activa", rec.sent), rec.st === "activa" ? "Campaña pausada" : "Campaña activada") },
          { t: "Eliminar campaña", kind: "x" as const, icon: "trash-2" as const, run: () => { const prev = modStore.get(); saveMod({ ...prev, msg: prev.msg.filter((x) => x.id !== rec.id) }, "Campaña eliminada", prev); onDone(); } },
        ] : []),
      ]} />
    </>
  );
}
