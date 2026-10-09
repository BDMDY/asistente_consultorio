"use client";
import { useState } from "react";
import { type Service, mediaStore, nextServiceCode, parsePrice, resolveMedia, serviceSessions, sessionValue, useMedia } from "@/lib/media";
import { toast } from "@/lib/toast";
import { BulkServices } from "./BulkServices";
import { Actions, ChipField, E, ModuleLayout, N, type Row, TextField } from "./kit";
import { money0 } from "@/lib/mod";

type Sel = null | { mode: "new" } | { mode: "bulk" } | { id: number };
const FILTERS = ["Todos", "Activos", "Inactivos", "En el sitio", "Solo uso interno"];

const barBtn: React.CSSProperties = { cursor: "pointer", border: 0, borderRadius: 10, padding: "8px 12px", minHeight: 38, fontWeight: 700, fontSize: 13, background: "var(--surface)", color: "var(--ink-900)", boxShadow: "inset 0 0 0 1px var(--line)", fontFamily: "inherit" };

function saveServices(list: Service[]) {
  mediaStore.update((m) => ({ ...m, services: list }));
}

export function Servicios() {
  const media = useMedia();
  const list = media.services;
  const [chip, setChip] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const isOn = (s: Service) => s.on !== false;

  const rows: Row[] = list
    .filter((s) => !chip || (chip === 1 ? isOn(s) : chip === 2 ? !isOn(s) : chip === 3 ? isOn(s) && s.web !== false : isOn(s) && s.web === false))
    .filter((s) => !q.trim() || `${s.name} ${s.code ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()))
    .map((s) => ({ id: String(s.id), t: s.name, sub: `${s.code ? s.code + " · " : ""}${s.dur ?? 30} min · ${serviceSessions(s)} ${serviceSessions(s) === 1 ? "sesión" : "sesiones"}${s.initial ? ` · inicial ${money0(s.initial)}` : ""}${isOn(s) ? (s.web === false ? " · solo uso interno" : " · en el sitio") : " · inactivo"}`, badge: parsePrice(s.price) > 0 ? money0(parsePrice(s.price)) : "Gratis", tone: isOn(s) ? N : E }));
  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const apply = (patch: Partial<Service>, msg: string) => {
    const prev = list;
    saveServices(list.map((s) => (picked.has(String(s.id)) ? { ...s, ...patch } : s)));
    toast(`${picked.size} servicios: ${msg}`, () => saveServices(prev));
    setPicked(new Set());
  };
  const bar = picking && (
    <div role="toolbar" aria-label="Acciones en bloque" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 12px", borderRadius: 14, background: "var(--brand-50)" }}>
      <b className="tnum" style={{ fontSize: 14 }}>{picked.size} seleccionados</b>
      <button type="button" style={barBtn} onClick={() => setPicked(new Set(rows.map((r) => r.id)))}>Seleccionar los {rows.length} de la lista</button>
      <button type="button" style={barBtn} onClick={() => setPicked(new Set())}>Limpiar</button>
      <span style={{ flex: 1 }} />
      {picked.size > 0 && (
        <>
          <button type="button" style={barBtn} onClick={() => apply({ web: true }, "se muestran en el sitio y la reserva web")}>Mostrar en el sitio</button>
          <button type="button" style={barBtn} onClick={() => apply({ web: false }, "solo uso interno")}>Solo uso interno</button>
          <button type="button" style={barBtn} onClick={() => apply({ on: true }, "activados")}>Activar</button>
          <button type="button" style={barBtn} onClick={() => apply({ on: false }, "desactivados")}>Desactivar</button>
        </>
      )}
    </div>
  );
  const active = list.filter(isOn);
  const priced = active.filter((s) => parsePrice(s.price) > 0);
  const avg = priced.length ? Math.round(priced.reduce((a, s) => a + parsePrice(s.price), 0) / priced.length) : 0;
  const cur = sel && "id" in sel ? list.find((s) => s.id === sel.id) : undefined;

  return (
    <ModuleLayout title="Servicios" sub={`${list.length} servicios · catálogo del sitio, la reserva y la agenda`} kpis={[{ l: "Activos", v: String(active.length) }, { l: "Precio promedio", v: money0(avg) }]}
      chips={FILTERS} chip={chip} onChip={setChip} query={q} onQuery={setQ} cta="Nuevo servicio" onCta={() => setSel({ mode: "new" })} extra={[{ label: "Seleccionar", icon: "check", pressed: picking, onClick: () => { setPicking(!picking); setPicked(new Set()); } }, { label: "Carga masiva", icon: "upload", onClick: () => setSel({ mode: "bulk" }) }]} select={{ on: picking, selected: picked, toggle: togglePick }} toolbar={bar} rows={rows}
      onOpen={(id) => setSel({ id: Number(id) })} onClose={() => setSel(null)}
      panelTitle={sel && "mode" in sel ? (sel.mode === "bulk" ? "Carga masiva de tratamientos" : "Nuevo servicio") : (cur?.name ?? "")}
      panel={sel && "mode" in sel ? (sel.mode === "bulk" ? <BulkServices onDone={() => setSel(null)} /> : <ServForm key="new" onDone={() => setSel(null)} />) : cur ? <ServForm key={cur.id} rec={cur} onDone={() => setSel(null)} /> : null} />
  );
}

function ServForm({ rec, onDone }: { rec?: Service; onDone: () => void }) {
  const [f, setF] = useState({ code: rec?.code ?? nextServiceCode(resolveMedia(mediaStore.get()).services), name: rec?.name ?? "", desc: rec?.desc ?? "", dur: String(rec?.dur ?? 30), price: rec?.price ?? "", sessions: String(rec?.sessions ?? 1), initial: rec?.initial ? String(rec.initial) : "", on: rec ? (rec.on !== false ? "Activo" : "Inactivo") : "Activo", web: rec ? (rec.web === false ? "Solo uso interno" : "En el sitio y la reserva web") : "En el sitio y la reserva web" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  function save() {
    if (!f.name.trim()) return toast("Indica el nombre");
    const list = resolveMedia(mediaStore.get()).services;
    const ini = parseFloat(f.initial);
    if (ini > 0 && !(ini < parsePrice(f.price))) return toast("El pago inicial debe ser menor al precio total");
    const code = f.code.trim().toUpperCase();
    if (!code) return toast("Indica el código");
    if (list.some((s) => s.id !== rec?.id && s.code?.toUpperCase() === code)) return toast(`El código ${code} ya lo usa otro servicio`);
    const item: Service = { id: rec?.id ?? Math.max(0, ...list.map((s) => s.id)) + 1, code, name: f.name.trim(), desc: f.desc.trim(), price: f.price.trim(), sessions: Math.max(1, Math.round(Number(f.sessions)) || 1), ...(ini > 0 ? { initial: ini } : {}), dur: Math.max(15, Number(f.dur) || 30), on: f.on === "Activo", ...(f.web === "Solo uso interno" ? { web: false } : {}) };
    saveServices(rec ? list.map((s) => (s.id === rec.id ? item : s)) : [...list, item]);
    toast(rec ? "Servicio actualizado" : "Servicio creado");
    onDone();
  }
  return (
    <>
      <TextField label="Código (para organizar el catálogo)" value={f.code} onChange={(v) => set({ code: v })} />
      <TextField label="Nombre del servicio" value={f.name} onChange={(v) => set({ name: v })} />
      <TextField label="Descripción (se muestra en el sitio)" value={f.desc} onChange={(v) => set({ desc: v })} />
      <TextField label="Duración (min)" value={f.dur} num onChange={(v) => set({ dur: v })} />
      <TextField label="Precio total del tratamiento (S/, vacío = no mostrar)" value={f.price} num onChange={(v) => set({ price: v })} />
      <TextField label="Número de sesiones del tratamiento" value={f.sessions} num onChange={(v) => set({ sessions: v })} />
      <TextField label="Pago inicial (S/, opcional · ej. ortodoncia)" value={f.initial} num onChange={(v) => set({ initial: v })} />
      {parsePrice(f.price) > 0 && <div className="tnum" style={{ fontSize: 13, color: "var(--ink-500)" }}>{parseFloat(f.initial) > 0 ? `Pago inicial ${money0(parseFloat(f.initial))} + ` : ""}cada sesión: {money0(sessionValue({ price: f.price, sessions: Number(f.sessions), initial: parseFloat(f.initial) || 0 }))} ({parseFloat(f.initial) > 0 ? `(${f.price} − ${f.initial})` : f.price} ÷ {Math.max(1, Math.round(Number(f.sessions)) || 1)})</div>}
      <ChipField label="Visibilidad para el paciente" value={f.web as "En el sitio y la reserva web" | "Solo uso interno"} options={["En el sitio y la reserva web", "Solo uso interno"] as const} onChange={(web) => set({ web })} />
      <ChipField label="Estado" value={f.on as "Activo" | "Inactivo"} options={["Activo", "Inactivo"] as const} onChange={(on) => set({ on })} />
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Guardar servicio", run: save, kind: "p", icon: "save" },
        ...(rec ? [{ t: "Eliminar servicio", run: () => { const prev = resolveMedia(mediaStore.get()).services; saveServices(prev.filter((s) => s.id !== rec.id)); toast("Servicio eliminado", () => saveServices(prev)); onDone(); }, kind: "x" as const, icon: "trash-2" as const }] : []),
      ]} />
    </>
  );
}
