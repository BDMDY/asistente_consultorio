"use client";
import { useState } from "react";
import { type Service, mediaStore, parsePrice, resolveMedia, serviceSessions, sessionValue, useMedia } from "@/lib/media";
import { toast } from "@/lib/toast";
import { Actions, ChipField, E, ModuleLayout, N, type Row, TextField } from "./kit";
import { money0 } from "@/lib/mod";

type Sel = null | { mode: "new" } | { id: number };
const FILTERS = ["Todos", "Activos", "Inactivos"];

function saveServices(list: Service[]) {
  mediaStore.update((m) => ({ ...m, services: list }));
}

export function Servicios() {
  const media = useMedia();
  const list = media.services;
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const isOn = (s: Service) => s.on !== false;

  const rows: Row[] = list
    .filter((s) => !chip || (chip === 1 ? isOn(s) : !isOn(s)))
    .filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((s) => ({ id: String(s.id), t: s.name, sub: `${s.dur ?? 30} min · ${serviceSessions(s)} ${serviceSessions(s) === 1 ? "sesión" : "sesiones"}${isOn(s) ? "" : " · inactivo"}`, badge: parsePrice(s.price) > 0 ? money0(parsePrice(s.price)) : "Gratis", tone: isOn(s) ? N : E }));
  const active = list.filter(isOn);
  const priced = active.filter((s) => parsePrice(s.price) > 0);
  const avg = priced.length ? Math.round(priced.reduce((a, s) => a + parsePrice(s.price), 0) / priced.length) : 0;
  const cur = sel && "id" in sel ? list.find((s) => s.id === sel.id) : undefined;

  return (
    <ModuleLayout title="Servicios" sub={`${list.length} servicios · catálogo del sitio, la reserva y la agenda`} kpis={[{ l: "Activos", v: String(active.length) }, { l: "Precio promedio", v: money0(avg) }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nuevo servicio" onCta={() => setSel({ mode: "new" })} rows={rows}
      onOpen={(id) => setSel({ id: Number(id) })} onClose={() => setSel(null)}
      panelTitle={sel && "mode" in sel ? "Nuevo servicio" : (cur?.name ?? "")}
      panel={sel && "mode" in sel ? <ServForm key="new" onDone={() => setSel(null)} /> : cur ? <ServForm key={cur.id} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function ServForm({ rec, onDone }: { rec?: Service; onDone: () => void }) {
  const [f, setF] = useState({ name: rec?.name ?? "", desc: rec?.desc ?? "", dur: String(rec?.dur ?? 30), price: rec?.price ?? "", sessions: String(rec?.sessions ?? 1), on: rec ? (rec.on !== false ? "Activo" : "Inactivo") : "Activo" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  function save() {
    if (!f.name.trim()) return toast("Indica el nombre");
    const list = resolveMedia(mediaStore.get()).services;
    const item: Service = { id: rec?.id ?? Math.max(0, ...list.map((s) => s.id)) + 1, name: f.name.trim(), desc: f.desc.trim(), price: f.price.trim(), sessions: Math.max(1, Math.round(Number(f.sessions)) || 1), dur: Math.max(15, Number(f.dur) || 30), on: f.on === "Activo" };
    saveServices(rec ? list.map((s) => (s.id === rec.id ? item : s)) : [...list, item]);
    toast(rec ? "Servicio actualizado" : "Servicio creado");
    onDone();
  }
  return (
    <>
      <TextField label="Nombre del servicio" value={f.name} onChange={(v) => set({ name: v })} />
      <TextField label="Descripción (se muestra en el sitio)" value={f.desc} onChange={(v) => set({ desc: v })} />
      <TextField label="Duración (min)" value={f.dur} num onChange={(v) => set({ dur: v })} />
      <TextField label="Precio total del tratamiento (S/, vacío = no mostrar)" value={f.price} num onChange={(v) => set({ price: v })} />
      <TextField label="Número de sesiones del tratamiento" value={f.sessions} num onChange={(v) => set({ sessions: v })} />
      {parsePrice(f.price) > 0 && <div className="tnum" style={{ fontSize: 13, color: "var(--ink-500)" }}>Cada sesión: {money0(sessionValue({ price: f.price, sessions: Number(f.sessions) }))} ({f.price} ÷ {Math.max(1, Math.round(Number(f.sessions)) || 1)})</div>}
      <ChipField label="Estado" value={f.on as "Activo" | "Inactivo"} options={["Activo", "Inactivo"] as const} onChange={(on) => set({ on })} />
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Guardar servicio", run: save, kind: "p", icon: "save" },
        ...(rec ? [{ t: "Eliminar servicio", run: () => { const prev = resolveMedia(mediaStore.get()).services; saveServices(prev.filter((s) => s.id !== rec.id)); toast("Servicio eliminado", () => saveServices(prev)); onDone(); }, kind: "x" as const, icon: "trash-2" as const }] : []),
      ]} />
    </>
  );
}
