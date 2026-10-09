"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isRemote } from "@/lib/backend/config";
import { type BrandConfig, brandStore, useBrand } from "@/lib/brand";
import { hm } from "@/lib/agenda";
import { agendaStore } from "@/lib/agenda-store";
import { WEEKDAYS_LONG, labelLong, todayISO } from "@/lib/dates";
import { type Schedule, dayWindow, scheduleOf } from "@/lib/schedule";
import { nextAgenda } from "@/lib/doctors";
import { type DiscountCamp, type DiscountCode, type Role, type Sede, type StaffUser, modStore, money0, saveMod, seedMod, uid, useMod } from "@/lib/mod";
import { enqueue } from "@/lib/outbox";
import { type PermRow, permsStore } from "@/lib/perms";
import { toast } from "@/lib/toast";
import { Actions, AreaField, ChipField, E, Field, G, ModuleLayout, N, type Row, SheetSub, TextField } from "./kit";
import { LinkBtn } from "./Planes";

const TABS = ["Marca y contacto", "Usuarios", "Sedes", "Notificaciones", "Descuentos", "Roles y permisos", "Horario"];
const CTA = ["Logo y colores", "Invitar usuario", "Nueva sede", "Restablecer", "Nuevo descuento", "Logo y colores", "Cierre especial"];
const TAB_SUB = ["Datos del consultorio", "Equipo con acceso", "Sedes y horarios", "Avisos automáticos", "Códigos y campañas de descuento", "Qué módulos ve cada rol", "Días y horas de atención"];
const ROLES: readonly Role[] = ["Administrador", "Doctor", "Asistente"];
const BRAND_FIELDS: [keyof BrandConfig, string, boolean?][] = [
  ["name", "Nombre comercial"], ["slogan", "Eslogan"], ["whatsapp", "WhatsApp"], ["phone", "Teléfono"], ["address", "Dirección", true], ["instagram", "Instagram"],
];
const NOTIF: [keyof ReturnType<typeof seedMod>["notif"], string, string][] = [
  ["wa24", "WhatsApp 24 h antes", "Recordatorio de cita"], ["wa2", "WhatsApp 2 h antes", "Recordatorio el mismo día"], ["mail", "Correo de confirmación", "Al reservar"], ["resumen", "Resumen diario al doctor", "Cada mañana 7:00"],
];

type Sel = null | { mode: "new" } | { id: string };

export function Configuracion() {
  const router = useRouter();
  const { data: d } = useMod();
  const brand = useBrand();
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Sel>(null);
  const switchTab = (i: number) => { setTab(i); setSel(null); setQ(""); };

  const sch = scheduleOf(brand.schedule);
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  const rows: Row[] = (() => {
    if (tab === 6) return [
      ...DAY_ORDER.map((i) => ({ id: `d:${i}`, t: cap(WEEKDAYS_LONG[i]), sub: sch.days[i].open ? `${hm(sch.days[i].from)}–${hm(sch.days[i].to)}` : "Día de descanso: no se crean citas", badge: sch.days[i].open ? "Abierto" : "Descanso", tone: sch.days[i].open ? G : N })),
      ...sch.closures.slice().sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ id: `c:${c.id}`, t: c.label || "Cierre especial", sub: labelLong(c.date), badge: "Cierre", tone: E })),
    ];
    if (tab === 0) return [
      ...BRAND_FIELDS.map(([k, l]) => ({ id: `b:${k}`, t: l, sub: String(brand[k] || "Sin completar"), badge: "Editar", tone: N })),
      { id: "lk:marca", t: "Logo, colores y fotos", sub: "Color primario, logo claro y oscuro, hero, equipo y galería", badge: "Abrir", tone: G },
      { id: "lk:roles", t: "Roles y permisos", sub: "Quién puede ver Finanzas, Inventario y más", badge: "Abrir", tone: G },
    ];
    if (tab === 1) return d.users.map((u) => ({ id: u.id, t: u.nom || u.mail, sub: `${u.rol}${u.cmp ? ` · CMP ${u.cmp}` : ""}${u.dni ? ` · DNI ${u.dni}` : ""}${u.tel ? ` · ${u.tel}` : ""} · ${u.mail}`, badge: u.on ? "Activo" : "Suspendido", tone: u.on ? G : E }));
    if (tab === 2) return d.sedes.map((z) => ({ id: z.id, t: z.n, sub: `${z.dir} · ${z.h}`, badge: "Editar", tone: N }));
    if (tab === 5) return ROLES.map((r) => ({ id: `role:${r}`, t: r, sub: "Define a qué módulos tiene acceso", badge: "Editar", tone: N }));
    if (tab === 4) return [
      ...d.desc.codes.map((c) => ({ id: c.id, t: c.code, sub: `${c.type === "%" ? `${c.val}%` : money0(c.val)} · usado ${c.used || 0}${c.max ? ` de ${c.max}` : " veces"}`, badge: c.on ? "Activo" : "Inactivo", tone: c.on ? G : N })),
      ...d.desc.camps.map((c) => ({ id: c.id, t: c.n, sub: `${c.type === "%" ? `${c.val}%` : money0(c.val)} · ${c.ap}${c.from ? ` · ${c.from} → ${c.to}` : ""}`, badge: c.on ? "Activa" : "Inactiva", tone: c.on ? G : N })),
    ];
    return NOTIF.map(([k, t, s]) => ({ id: `n:${k}`, t, sub: s, badge: d.notif[k] ? "Activa" : "Apagada", tone: d.notif[k] ? G : N }));
  })().filter((r) => !q.trim() || `${r.t} ${r.sub}`.toLowerCase().includes(q.trim().toLowerCase()));

  const onCta = () => {
    if (tab === 0 || tab === 5) return router.push("/intranet/marca");
    if (tab === 6) return setSel({ mode: "new" });
    if (tab === 3) {
      const prev = modStore.get();
      saveMod({ ...prev, notif: seedMod().notif }, "Notificaciones restablecidas", prev);
      return;
    }
    setSel({ mode: "new" });
  };

  const id = sel && "id" in sel ? sel.id : "";
  let panel: React.ReactNode = null, title = "";
  if (sel) {
    if (tab === 1) { title = "mode" in sel ? "Invitar usuario" : (d.users.find((u) => u.id === id)?.nom ?? ""); panel = <UserForm key={id || "new"} rec={d.users.find((u) => u.id === id)} onDone={() => setSel(null)} />; }
    else if (tab === 2) { title = "mode" in sel ? "Nueva sede" : (d.sedes.find((z) => z.id === id)?.n ?? ""); panel = <SedeForm key={id || "new"} rec={d.sedes.find((z) => z.id === id)} onDone={() => setSel(null)} />; }
    else if (tab === 4) { const c = d.desc.codes.find((x) => x.id === id), g = d.desc.camps.find((x) => x.id === id); title = "mode" in sel ? "Nuevo descuento" : (c?.code ?? g?.n ?? ""); panel = <DiscountForm key={id || "new"} code={c} camp={g} onDone={() => setSel(null)} />; }
    else if (tab === 3) { const k = id.slice(2) as keyof typeof d.notif; const n = NOTIF.find((x) => x[0] === k); if (n) { title = n[1]; panel = <NotifSheet n={n} on={d.notif[k]} onDone={() => setSel(null)} />; } }
    else if (tab === 5) { title = "Roles y permisos"; panel = <RolesSheet initial={id.slice(5) as Role} />; }
    else if (tab === 6) {
      if ("mode" in sel) { title = "Cierre especial"; panel = <ClosureForm onDone={() => setSel(null)} />; }
      else if (id.startsWith("d:")) { const i = Number(id.slice(2)); title = cap(WEEKDAYS_LONG[i]); panel = <DayForm key={id} day={i} onDone={() => setSel(null)} />; }
      else { const c = sch.closures.find((x) => `c:${x.id}` === id); if (c) { title = c.label || "Cierre especial"; panel = <ClosureForm key={id} rec={c} onDone={() => setSel(null)} />; } }
    }
    else if (tab === 0) {
      if (id.startsWith("lk:")) { title = id === "lk:marca" ? "Logo, colores y fotos" : "Roles y permisos"; panel = id === "lk:marca" ? <><SheetSub sub="Color primario, logo claro y oscuro, foto principal, equipo, instalaciones y casos." badge="Configuración de marca" /><LinkBtn href="/intranet/marca" icon="palette">Configuración de marca</LinkBtn><LinkBtn href="/intranet/medios" icon="image-up">Medios del sitio (fotos y listas)</LinkBtn></> : <RolesSheet initial="Doctor" />; }
      else { const f = BRAND_FIELDS.find((x) => `b:${x[0]}` === id); if (f) { title = f[1]; panel = <BrandFieldForm key={id} k={f[0]} label={f[1]} area={f[2]} onDone={() => setSel(null)} />; } }
    }
  }

  return (
    <ModuleLayout title="Configuración" sub={`${brand.name} · ${TAB_SUB[tab]}`} kpis={[{ l: "Usuarios activos", v: String(d.users.filter((u) => u.on).length) }, { l: "Sedes", v: String(d.sedes.length) }]}
      chips={TABS} chip={tab} onChip={switchTab} query={q} onQuery={setQ} cta={CTA[tab]} onCta={onCta} rows={rows} onOpen={(i) => setSel({ id: i })} onClose={() => setSel(null)} panelTitle={title} panel={panel} />
  );
}

function BrandFieldForm({ k, label, area, onDone }: { k: keyof BrandConfig; label: string; area?: boolean; onDone: () => void }) {
  const brand = useBrand();
  const [v, setV] = useState(String(brand[k] ?? ""));
  return (
    <>
      {area ? <AreaField label={label} value={v} onChange={setV} /> : <TextField label={label} value={v} onChange={setV} />}
      <Actions items={[
        { t: "Guardar", kind: "p", icon: "save", run: () => { if (!v.trim()) return toast("No puede quedar vacío"); brandStore.update((b) => ({ ...b, [k]: v.trim() })); toast("Marca actualizada"); onDone(); } },
      ]} />
      <LinkBtn href="/intranet/marca" icon="palette">Editar logo, colores y fotos</LinkBtn>
    </>
  );
}

const isEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

function UserForm({ rec, onDone }: { rec?: StaffUser; onDone: () => void }) {
  const { data: d } = useMod();
  const [f, setF] = useState({ nom: rec?.nom ?? "", dni: rec?.dni ?? "", rol: (rec?.rol ?? "Asistente") as Role, cmp: rec?.cmp ?? "", titulo: rec?.titulo ?? "", mail: rec?.mail ?? "", tel: rec?.tel ?? "", on: rec ? (rec.on ? "Activo" : "Suspendido") : "Activo" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const o = { ...f, nom: f.nom.trim(), dni: f.dni.trim(), mail: f.mail.trim(), tel: f.tel.trim(), cmp: f.rol === "Doctor" ? f.cmp.trim() : "" };
  const err = !o.nom ? "Indica el nombre completo" : !/^\d{8}$/.test(o.dni) ? "El DNI debe tener 8 dígitos" : d.users.some((u) => u.id !== rec?.id && u.dni === o.dni) ? "Ya existe un usuario con ese DNI"
      : o.rol === "Doctor" && !f.titulo ? "Elige el tratamiento: Dr. o Dra." : o.rol === "Doctor" && !/^\d{4,6}$/.test(o.cmp) ? "Indica el N.º de colegiatura (4 a 6 dígitos)" : !isEmail(o.mail) ? "Correo no válido" : d.users.some((u) => u.id !== rec?.id && u.mail === o.mail) ? "Ese correo ya está registrado"
    : !/^9\d{8}$/.test(o.tel) ? "El celular debe tener 9 dígitos y empezar con 9" : "";
  const admins = d.users.filter((u) => u.rol === "Administrador" && u.on).length;
  const commit = (users: StaffUser[], msg: string) => { const prev = modStore.get(); saveMod({ ...prev, users }, msg, prev); onDone(); };
  function save() {
    if (err) return toast(err);
    if (rec && rec.rol === "Administrador" && o.rol !== "Administrador" && admins <= 1) return toast("Debe quedar al menos un administrador");
    // Número de agenda del doctor: lo asigna el servidor en modo remoto; en demo se toma el siguiente libre.
    const agenda = rec?.agenda ?? (o.rol === "Doctor" && !isRemote ? nextAgenda(d.users) : undefined);
    const item: StaffUser = { id: rec?.id ?? uid(), nom: o.nom, dni: o.dni, cmp: o.cmp, mail: o.mail, tel: o.tel, rol: o.rol, on: f.on === "Activo", ...(o.rol === "Doctor" && f.titulo ? { titulo: f.titulo } : {}), ...(agenda ? { agenda } : {}) };
    if (rec && o.rol === "Doctor" && !agenda && !isRemote) item.agenda = nextAgenda(d.users);
    if (rec) commit(d.users.map((u) => (u.id === rec.id ? item : u)), "Usuario actualizado");
    else { enqueue({ kind: "invitacion", channel: "correo", patient: o.mail, text: `Invitación al equipo (${o.rol})` }); commit([item, ...d.users], `Usuario registrado · invitación en cola para ${o.mail}`); }
  }
  return (
    <>
      <TextField label="Nombre completo" value={f.nom} onChange={(v) => set({ nom: v })} />
      <TextField label="DNI" value={f.dni} num onChange={(v) => set({ dni: v })} />
      <ChipField label="Perfil" value={f.rol} options={ROLES} onChange={(rol) => set({ rol })} />
      {f.rol === "Doctor" && <ChipField label="Tratamiento" value={f.titulo as "Dr." | "Dra."} options={["Dr.", "Dra."] as const} onChange={(titulo) => set({ titulo })} />}
      {f.rol === "Doctor" && <TextField label="N.º de colegiatura (CMP)" value={f.cmp} num onChange={(v) => set({ cmp: v })} />}
      <TextField label="Correo" value={f.mail} onChange={(v) => set({ mail: v })} />
      <TextField label="Teléfono celular" value={f.tel} num onChange={(v) => set({ tel: v })} />
      {rec && <ChipField label="Acceso" value={f.on as "Activo" | "Suspendido"} options={["Activo", "Suspendido"] as const} onChange={(on) => set({ on })} />}
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Guardar e invitar", kind: "p", icon: rec ? "save" : "send", run: save },
        ...(rec ? [
          { t: "Reenviar invitación", icon: "send" as const, run: () => { enqueue({ kind: "invitacion", channel: "correo", patient: rec.mail, text: "Reenvío de invitación" }); onDone(); toast(`Invitación en cola para ${rec.mail}`); } },
          { t: "Eliminar usuario", kind: "x" as const, icon: "trash-2" as const, run: () => (rec.rol === "Administrador" && admins <= 1 ? toast("Debe quedar al menos un administrador") : commit(d.users.filter((u) => u.id !== rec.id), "Usuario eliminado")) },
        ] : []),
      ]} />
    </>
  );
}

function SedeForm({ rec, onDone }: { rec?: Sede; onDone: () => void }) {
  const { data: d } = useMod();
  const [f, setF] = useState({ n: rec?.n ?? "", dir: rec?.dir ?? "", h: rec?.h ?? "Lun–Sáb 9:00–19:00" });
  const commit = (sedes: Sede[], msg: string) => { const prev = modStore.get(); saveMod({ ...prev, sedes }, msg, prev); onDone(); };
  return (
    <>
      <TextField label="Nombre de la sede" value={f.n} onChange={(n) => setF({ ...f, n })} />
      <TextField label="Dirección" value={f.dir} onChange={(dir) => setF({ ...f, dir })} />
      <TextField label="Horario" value={f.h} onChange={(h) => setF({ ...f, h })} />
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Guardar sede", kind: "p", icon: "save", run: () => { if (!f.n.trim()) return toast("Indica el nombre"); const item = { id: rec?.id ?? uid(), n: f.n.trim(), dir: f.dir.trim(), h: f.h }; commit(rec ? d.sedes.map((z) => (z.id === rec.id ? item : z)) : [item, ...d.sedes], rec ? "Sede actualizada" : "Sede agregada"); } },
        ...(rec ? [{ t: "Eliminar sede", kind: "x" as const, icon: "trash-2" as const, run: () => (d.sedes.length <= 1 ? toast("Debe quedar al menos una sede") : commit(d.sedes.filter((z) => z.id !== rec.id), "Sede eliminada")) }] : []),
      ]} />
    </>
  );
}

function DiscountForm({ code, camp, onDone }: { code?: DiscountCode; camp?: DiscountCamp; onDone: () => void }) {
  const { data: d } = useMod();
  const rec = code ?? camp;
  const [isCode, setIsCode] = useState(code ? true : camp ? false : true);
  const [f, setF] = useState({
    code: code?.code ?? "", n: camp?.n ?? "", ap: camp?.ap ?? "Todos los servicios", from: camp?.from ?? "", to: camp?.to ?? "",
    type: (rec?.type ?? "%") as "%" | "S/", val: String(rec?.val ?? ""), max: String(code?.max ?? 0), on: rec ? (rec.on ? "Activo" : "Inactivo") : "Activo",
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const commit = (desc: typeof d.desc, msg: string) => { const prev = modStore.get(); saveMod({ ...prev, desc }, msg, prev); onDone(); };
  function save() {
    const v = Number(f.val) || 0;
    if (!(v > 0) || (f.type === "%" && v > 100)) return toast("Indica un valor válido");
    if (isCode) {
      const cd = f.code.trim().toUpperCase();
      if (!cd) return toast("Indica el código");
      if (d.desc.codes.some((x) => x.id !== code?.id && x.code === cd)) return toast("Ese código ya existe");
      const item: DiscountCode = { id: code?.id ?? uid(), code: cd, type: f.type, val: v, max: Number(f.max) || 0, used: code?.used ?? 0, on: f.on === "Activo" };
      commit({ ...d.desc, codes: code ? d.desc.codes.map((x) => (x.id === code.id ? item : x)) : [item, ...d.desc.codes] }, code ? "Descuento actualizado" : `Código ${cd} creado`);
    } else {
      if (!f.n.trim()) return toast("Indica el nombre");
      const item: DiscountCamp = { id: camp?.id ?? uid(), n: f.n.trim(), type: f.type, val: v, ap: f.ap, from: f.from, to: f.to, on: f.on === "Activo" };
      commit({ ...d.desc, camps: camp ? d.desc.camps.map((x) => (x.id === camp.id ? item : x)) : [item, ...d.desc.camps] }, camp ? "Descuento actualizado" : "Campaña creada");
    }
  }
  return (
    <>
      {rec && <SheetSub sub={code ? `Usado ${code.used || 0}${code.max ? ` de ${code.max} usos` : " veces · sin límite"}` : `${camp!.ap} · ${camp!.from || "—"} → ${camp!.to || "—"}`} badge={rec.on ? "Activo" : "Inactivo"} tone={rec.on ? G : N} />}
      {!rec && <ChipField label="Tipo" value={isCode ? "Código promocional" : "Campaña preconfigurada"} options={["Código promocional", "Campaña preconfigurada"] as const} onChange={(v) => setIsCode(v === "Código promocional")} />}
      {isCode ? <TextField label="Código (ej. VERANO15)" value={f.code} onChange={(v) => set({ code: v })} /> : (
        <>
          <TextField label="Nombre de la campaña" value={f.n} onChange={(v) => set({ n: v })} />
          <TextField label="Aplica a" value={f.ap} onChange={(v) => set({ ap: v })} />
          <TextField label="Desde" type="date" value={f.from} onChange={(v) => set({ from: v })} />
          <TextField label="Hasta" type="date" value={f.to} onChange={(v) => set({ to: v })} />
        </>
      )}
      <ChipField label="Descuento en" value={f.type} options={["%", "S/"] as const} onChange={(type) => set({ type })} />
      <TextField label="Valor" value={f.val} num onChange={(v) => set({ val: v })} />
      {isCode && <TextField label="Usos máximos (0 = ilimitado)" value={f.max} num onChange={(v) => set({ max: v })} />}
      {rec && <ChipField label="Estado" value={f.on as "Activo" | "Inactivo"} options={["Activo", "Inactivo"] as const} onChange={(on) => set({ on })} />}
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Crear descuento", kind: "p", icon: rec ? "save" : "tag", run: save },
        ...(rec ? [{ t: "Eliminar", kind: "x" as const, icon: "trash-2" as const, run: () => commit({ ...d.desc, codes: d.desc.codes.filter((x) => x.id !== rec.id), camps: d.desc.camps.filter((x) => x.id !== rec.id) }, "Descuento eliminado") }] : []),
      ]} />
    </>
  );
}

function NotifSheet({ n, on, onDone }: { n: [string, string, string]; on: boolean; onDone: () => void }) {
  return (
    <>
      <SheetSub sub={n[2]} badge={on ? "Activa" : "Apagada"} tone={on ? G : N} />
      <Actions items={[{ t: on ? "Apagar" : "Activar", kind: "p", icon: on ? "bell-off" : "bell", run: () => { const prev = modStore.get(); saveMod({ ...prev, notif: { ...prev.notif, [n[0]]: !on } }, n[1] + (on ? " apagada" : " activada"), prev); onDone(); } }]} />
    </>
  );
}

function RolesSheet({ initial }: { initial: Role }) {
  const [perms] = permsStore.useStore();
  const [role, setRole] = useState<Role>(initial);
  const col = ROLES.indexOf(role) + 1;
  const allowed = perms.filter((p) => p[col as 1 | 2 | 3]).length;
  function toggle(i: number) {
    if (role === "Administrador") return toast("El administrador siempre tiene acceso total");
    const np: PermRow[] = perms.map((x) => [...x] as PermRow);
    np[i][col as 2 | 3] = np[i][col as 2 | 3] ? 0 : 1;
    permsStore.set(np);
  }
  return (
    <>
      <SheetSub sub="Toca un módulo para permitir o quitar el acceso a este rol. Se guarda al instante." badge={`${allowed} de ${perms.length} módulos`} tone={G} />
      <ChipField label="Rol" value={role} options={ROLES} onChange={setRole} />
      <Actions items={perms.map((p, i) => {
        const on = !!p[col as 1 | 2 | 3];
        return { t: `${p[0]} · ${on ? "Permitido" : "Sin acceso"}`, icon: on ? ("check" as const) : ("lock" as const), run: () => toggle(i), tone: on ? G : undefined };
      })} />
    </>
  );
}

const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

/** Citas futuras (no canceladas) que quedarían fuera del horario nuevo. */
function outsideCount(next: Schedule): number {
  const today = todayISO();
  return agendaStore.get().appts.filter((a) => {
    if (a.date < today || a.st === "cancelada" || a.st === "bloqueo") return false;
    const w = dayWindow(a.date, next);
    return !w || a.slot < w.from || a.slot + a.dur > w.to;
  }).length;
}

function saveSchedule(next: Schedule, msg: string) {
  const prev = brandStore.get();
  brandStore.update((b) => ({ ...b, schedule: next }));
  const n = outsideCount(next);
  toast(n ? `${msg} · ${n} cita(s) futuras quedan fuera del horario: revísalas en la agenda` : msg, () => brandStore.set(prev));
}

function DayForm({ day, onDone }: { day: number; onDone: () => void }) {
  const brand = useBrand();
  const sch = scheduleOf(brand.schedule);
  const cur = sch.days[day];
  const [open, setOpen] = useState<"Abierto" | "Descanso">(cur.open ? "Abierto" : "Descanso");
  const [from, setFrom] = useState(cur.from);
  const [to, setTo] = useState(cur.to);
  const sel: React.CSSProperties = { height: 48, borderRadius: 12, border: 0, boxShadow: "inset 0 0 0 1px var(--line)", padding: "0 14px", fontSize: 15, background: "var(--surface)", color: "inherit", fontFamily: "inherit", width: "100%" };
  const bad = open === "Abierto" && to <= from;
  const apply = (days: number[]) => {
    if (bad) return toast("La hora de cierre debe ser posterior a la de apertura");
    const next: Schedule = { ...sch, days: sch.days.map((d, i) => (days.includes(i) ? { open: open === "Abierto", from, to } : d)) };
    saveSchedule(next, days.length > 1 ? "Horario actualizado para varios días" : "Horario actualizado");
    onDone();
  };
  return (
    <>
      <SheetSub sub="Fuera de este horario no se pueden crear citas, ni en la agenda ni en la reserva web." />
      <ChipField label="Estado" value={open} options={["Abierto", "Descanso"] as const} onChange={setOpen} />
      {open === "Abierto" && (
        <>
          <Field label="Abre"><select aria-label="Abre" style={sel} value={from} onChange={(e) => setFrom(+e.target.value)}>{Array.from({ length: 32 }, (_, k) => <option key={k} value={k}>{hm(k)}</option>)}</select></Field>
          <Field label="Cierra"><select aria-label="Cierra" style={sel} value={to} onChange={(e) => setTo(+e.target.value)}>{Array.from({ length: 32 }, (_, k) => <option key={k + 1} value={k + 1}>{hm(k + 1)}</option>)}</select></Field>
          {bad && <div role="alert" style={{ color: "var(--error-fg)", fontSize: 13, fontWeight: 600 }}>La hora de cierre debe ser posterior a la de apertura.</div>}
        </>
      )}
      <Actions items={[
        { t: "Guardar", kind: "p", icon: "save", run: () => apply([day]) },
        { t: day === 6 || day === 0 ? "Aplicar a sábado y domingo" : "Aplicar a lunes–viernes", icon: "check", run: () => apply(day === 6 || day === 0 ? [6, 0] : [1, 2, 3, 4, 5]) },
      ]} />
    </>
  );
}

function ClosureForm({ rec, onDone }: { rec?: { id: string; date: string; label: string }; onDone: () => void }) {
  const brand = useBrand();
  const sch = scheduleOf(brand.schedule);
  const [date, setDate] = useState(rec?.date ?? "");
  const [label, setLabel] = useState(rec?.label ?? "");
  const save = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return toast("Elige la fecha");
    if (sch.closures.some((c) => c.date === date && c.id !== rec?.id)) return toast("Ya hay un cierre en esa fecha");
    const item = { id: rec?.id ?? uid(), date, label: label.trim() };
    saveSchedule({ ...sch, closures: rec ? sch.closures.map((c) => (c.id === rec.id ? item : c)) : [...sch.closures, item] }, rec ? "Cierre actualizado" : "Cierre especial agregado");
    onDone();
  };
  return (
    <>
      <SheetSub sub="Feriados, vacaciones u otros días en que la clínica no atiende. Ese día no se podrán crear citas." />
      <TextField label="Fecha (AAAA-MM-DD)" type="date" value={date} onChange={setDate} />
      <TextField label="Motivo (opcional)" value={label} onChange={setLabel} />
      <Actions items={[
        { t: rec ? "Guardar cambios" : "Agregar cierre", kind: "p", icon: "save", run: save },
        ...(rec ? [{ t: "Quitar cierre", kind: "x" as const, icon: "trash-2" as const, run: () => { saveSchedule({ ...sch, closures: sch.closures.filter((c) => c.id !== rec.id) }, "Cierre quitado"); onDone(); } }] : []),
      ]} />
    </>
  );
}
