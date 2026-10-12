"use client";
import { useState } from "react";
import { type Msg, type MsgSeg, type MsgStatus, modStore, saveMod, uid, useMod } from "@/lib/mod";
import { type OutboxItem, enqueue, outboxStore, waNumber, waUrl } from "@/lib/outbox";
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

type Cat = "invitaciones" | "citas" | "campanas" | "cobros";
const CATS: [Cat, string, OutboxItem["kind"][]][] = [
  ["invitaciones", "Invitaciones", ["invitacion"]],
  ["citas", "Avisos de citas", ["cancelacion", "reprogramacion", "recordatorio", "demora"]],
  ["campanas", "Campañas", ["campana"]],
  ["cobros", "Cobros y pedidos", ["cobranza", "comprobante", "pedido"]],
];
const KIND_LABEL: Record<OutboxItem["kind"], string> = { cancelacion: "Cancelación", recordatorio: "Recordatorio", reprogramacion: "Reprogramación", campana: "Campaña", cobranza: "Cobranza", comprobante: "Comprobante", pedido: "Pedido a proveedor", invitacion: "Invitación al equipo", demora: "Aviso de demora" };
const catOf = (k: OutboxItem["kind"]) => CATS.find((c) => c[2].includes(k))?.[0] ?? "citas";
const when = (iso: string) => new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export function Mensajes() {
  const { data: d } = useMod();
  const [outbox] = outboxStore.useStore();
  const month = new Date().toISOString().slice(0, 7);
  const sentMonth = outbox.filter((o) => o.status === "enviado" && o.at.startsWith(month)).length;
  const queuedBy = (c: Cat) => outbox.filter((o) => o.status === "en-cola" && catOf(o.kind) === c).length;
  const [view, setView] = useState<"camp" | "cola">("camp");
  const [chip, setChip] = useState(0);
  const [qchip, setQchip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const cat = (m: Msg) => (m.st === "activa" ? 1 : m.st === "borrador" ? 2 : 0);
  const cola = view === "cola";
  const rows: Row[] = cola
    ? [...outbox]
        .filter((o) => !qchip || catOf(o.kind) === CATS[qchip - 1][0])
        .filter((o) => !q.trim() || `${o.patient} ${o.text}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((o) => ({ id: "q" + o.id, t: `${KIND_LABEL[o.kind]} · ${o.patient}`, sub: `${o.channel === "whatsapp" ? "WhatsApp" : "Correo"} · ${when(o.at)}`, badge: o.status === "enviado" ? "Enviado" : "En cola", tone: o.status === "enviado" ? G : W }))
    : d.msg
        .filter((m) => !chip || cat(m) === chip)
        .filter((m) => !q.trim() || m.n.toLowerCase().includes(q.trim().toLowerCase()))
        .map((m) => ({
          id: m.id, t: m.n,
          sub: `${segLabel(segOf(m))}${m.link && m.link !== "Sin enlace" ? ` · enlace: ${m.link.toLowerCase()}` : ""}${m.sent ? ` · ${m.sent} en cola` : ""}`,
          badge: m.st === "activa" ? "Activa" : m.st === "pausada" ? "Pausada" : "Borrador", tone: m.st === "activa" ? G : m.st === "pausada" ? W : N,
        }));
  const curQ = cola && sel && "id" in sel ? outbox.find((o) => "q" + o.id === sel.id) : undefined;
  const cur = !cola && sel && "id" in sel ? d.msg.find((m) => m.id === sel.id) : undefined;
  const kpis = cola
    ? [...CATS.map(([c, l]) => ({ l: `${l} en cola`, v: String(queuedBy(c)) })), { l: "Enviados (mes)", v: String(sentMonth) }]
    : [{ l: "Campañas activas", v: String(d.msg.filter((m) => m.st === "activa").length) }, { l: "Campañas en cola", v: String(queuedBy("campanas")) }, { l: "Enviados (mes)", v: String(sentMonth) }];
  const toggle = { label: cola ? "Ver campañas" : `Cola de envíos (${outbox.filter((o) => o.status === "en-cola").length})`, icon: (cola ? "arrow-left" : "send") as "arrow-left" | "send", onClick: () => { setView(cola ? "camp" : "cola"); setSel(null); setQ(""); } };
  return (
    <ModuleLayout title={cola ? "Cola de envíos" : "Mensajes y campañas"} sub={cola ? "Pendientes de WhatsApp y correo" : "WhatsApp y correo"} kpis={kpis}
      chips={cola ? ["Todos", ...CATS.map((c) => c[1])] : FILTERS} chip={cola ? qchip : chip} onChip={cola ? setQchip : setChip} query={q} onQuery={setQ} cta="Nueva campaña" onCta={() => { setView("camp"); setSel({ mode: "new" }); }} extra={toggle} rows={rows}
      onOpen={(id) => setSel({ id })} onClose={() => setSel(null)} panelTitle={curQ ? KIND_LABEL[curQ.kind] : sel && "mode" in sel ? "Nueva campaña" : (cur?.n ?? "")}
      panel={curQ ? <QueueDetail key={curQ.id} item={curQ} onDone={() => setSel(null)} /> : sel && "mode" in sel ? <CampaignForm key="new" onDone={() => setSel(null)} /> : cur ? <CampaignForm key={cur.id} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function QueueDetail({ item, onDone }: { item: OutboxItem; onDone: () => void }) {
  const [phone, setPhone] = useState(item.phone ?? "");
  const wa = item.channel === "whatsapp" && item.kind !== "campana"; // una campaña es una audiencia, no un solo chat
  const url = waUrl(phone, item.text);
  const line = (l: string, v: string) => <div style={{ display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600 }}>{l}</span><span style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{v}</span></div>;
  const mark = (extra: Partial<OutboxItem> = {}) => outboxStore.update((l) => l.map((o) => (o.id === item.id ? { ...o, ...extra, status: "enviado" as const } : o)));
  return (
    <>
      {line("Tipo", KIND_LABEL[item.kind])}
      {line("Destinatario", item.patient)}
      {line("Canal", item.channel === "whatsapp" ? "WhatsApp" : "Correo")}
      {line("Registrado", when(item.at))}
      {line("Mensaje", item.text)}
      {wa && item.status === "en-cola" && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--ink-500)", fontWeight: 600 }}>
          Celular de WhatsApp{waNumber(phone) ? "" : " (9 dígitos)"}
          <input value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, ""))} placeholder="9XX XXX XXX" style={{ height: 44, borderRadius: 10, border: "1px solid var(--line)", padding: "0 12px", fontSize: 15, background: "var(--surface)", color: "inherit" }} />
        </label>
      )}
      <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
        {wa ? "«Enviar por WhatsApp» abre el chat con el mensaje ya escrito; solo toca Enviar. El envío totalmente automático se activa al conectar la API de WhatsApp." : item.kind === "campana" ? "Las campañas se envían a toda la audiencia al conectar la API de WhatsApp. Aún no se pueden enviar desde aquí." : "Los correos automáticos se activan al conectar un servicio de correo. Puedes marcarlo como enviado si lo mandaste a mano."}
      </div>
      <Actions items={[
        ...(item.status === "en-cola" && wa ? [{ t: "Enviar por WhatsApp", kind: "p" as const, icon: "send" as const, run: () => { if (!url) return toast("Escribe un celular válido de 9 dígitos"); window.open(url, "_blank", "noopener,noreferrer"); mark({ phone: waNumber(phone) }); toast("Chat abierto · marcado como enviado"); onDone(); } }] : []),
        ...(item.status === "en-cola" ? [{ t: "Marcar como enviado", icon: "check" as const, run: () => { mark(); toast("Marcado como enviado"); onDone(); } }] : []),
        { t: "Descartar de la cola", kind: "x" as const, icon: "trash-2" as const, run: () => { outboxStore.update((l) => l.filter((o) => o.id !== item.id)); toast("Descartado"); onDone(); } },
      ]} />
    </>
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
