"use client";
import { useBrand } from "@/lib/brand";
import Link from "next/link";
import Icon, { type IconName } from "@/components/ui/Icon";
import { agendaStore } from "@/lib/agenda-store";
import { STATUS_LABEL, hm, type ApptStatus } from "@/lib/agenda";
import { dayWindow, scheduleOf } from "@/lib/schedule";
import { labelLong } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { useDoctors } from "@/lib/doctors";
import { useMod } from "@/lib/mod";
import { canAccess, permsStore } from "@/lib/perms";
import { currentUser, resolveSede, sedeStore, sessionStore } from "@/lib/session";
import s from "./inicio.module.css";

const money = (n: number) => "S/ " + Number(n || 0).toLocaleString("en-US");
const tone = (st: ApptStatus): [string, string] => [`var(--st-${st}-bg)`, `var(--st-${st}-fg)`];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function Inicio() {
  const today = useToday();
  const { data: mod, low, pending } = useMod();
  const [{ appts }] = agendaStore.useStore();
  const [session] = sessionStore.useStore();
  const [perms] = permsStore.useStore();
  const [sede] = sedeStore.useStore();
  const user = currentUser(session, mod);
  const docs = useDoctors();
  const brand = useBrand();
  const sedeActiva = resolveSede(sede, mod.sedes.map((z) => z.n));

  const todays = appts.filter((a) => a.date === today && a.st !== "cancelada" && a.st !== "bloqueo").sort((a, b) => a.slot - b.slot);
  const unconfirmed = todays.filter((a) => a.st === "pendiente").length;
  const win = dayWindow(today || "2000-01-03", scheduleOf(brand.schedule));
  const dayCap = win ? win.to - win.from : 32;
  const occ = docs.map((d) => ({ name: d.name, pct: Math.min(100, Math.round((todays.filter((a) => a.doc === d.id).reduce((n, a) => n + a.dur, 0) / dayCap) * 100)) }));
  const occAvg = occ.length ? Math.round(occ.reduce((n, o) => n + o.pct, 0) / occ.length) : 0;
  const paid = mod.fin.filter((f) => f.st === "pagado").reduce((n, f) => n + f.a, 0);
  const pendTotal = pending.reduce((n, f) => n + f.a, 0);
  const can = (m: string) => canAccess(perms, user?.rol, m);
  const M = "/intranet/modulos/";

  const shortcuts: { t: string; h: string; icon: IconName; primary?: boolean; show: boolean }[] = [
    { t: "Nueva cita", h: "/intranet/agenda?nueva=1", icon: "plus", primary: true, show: can("Agenda") },
    { t: "Nuevo paciente", h: "/intranet/pacientes?nuevo=1", icon: "user-plus", show: can("Pacientes") },
    { t: "Registrar cobro", h: M + "finanzas", icon: "banknote", show: can("Finanzas") },
  ];
  const kpis = [
    { l: "Citas de hoy", v: String(todays.length), sub: `${unconfirmed} sin confirmar`, h: "/intranet/agenda", show: can("Agenda") },
    { l: "Ocupación", v: `${occAvg}%`, sub: occ.slice(0, 2).map((o) => `${o.name.replace(/^Dra?\. /, "")} ${o.pct}%`).join(" · ") || "Sin doctores", h: M + "reportes", show: can("Reportes") },
    { l: "Ingresos cobrados", v: money(paid), sub: "Mes en curso", h: M + "finanzas", show: can("Finanzas") },
    { l: "Stock bajo", v: String(low.length), sub: low.length ? low.slice(0, 2).map((i) => i.n).join(", ") : "Todo en orden", c: low.length ? "var(--error-fg)" : undefined, h: M + "inventario", show: can("Inventario") },
  ].filter((k) => k.show);
  const alertsAll: { t: string; sub: string; h: string; icon: IconName; c: string; show: boolean }[] = [
    { t: `${low.length} productos con stock bajo`, sub: "Revisa el inventario y pide a proveedor", h: M + "inventario", icon: "package", c: "var(--error-fg)", show: can("Inventario") && low.length > 0 },
    { t: `${pending.length} cobros pendientes · ${money(pendTotal)}`, sub: "Registra el pago o envía un recordatorio", h: M + "finanzas", icon: "wallet", c: "var(--warning-fg)", show: can("Finanzas") && pending.length > 0 },
    { t: `${unconfirmed} pacientes sin confirmar la cita de hoy`, sub: "Envía el recordatorio por WhatsApp", h: "/intranet/agenda", icon: "message-circle", c: "var(--warning-fg)", show: can("Agenda") && unconfirmed > 0 },
  ];
  const alerts = alertsAll.filter((a) => a.show);

  return (
    <div className={s.page}>
      <div className={s.head}>
        <div>
          <h1 className={s.h1}>{greeting()}, {user?.nom.split(" ")[0]}</h1>
          <div className={s.date}>{today ? labelLong(today).replace(/^./, (c) => c.toUpperCase()) : ""}{sedeActiva ? ` · ${sedeActiva}` : ""}</div>
        </div>
        <div className={s.shortcuts}>
          {shortcuts.filter((x) => x.show).map((x) => (
            <Link key={x.t} href={x.h} className={`${s.shortcut} ${x.primary ? s.primary : ""}`}><Icon name={x.icon} />{x.t}</Link>
          ))}
        </div>
      </div>

      <div className={s.kpis}>
        {kpis.map((k) => (
          <Link key={k.l} href={k.h} className={s.kpi}>
            <span className={s.kpiL}>{k.l}</span>
            <b className="tnum" style={{ fontSize: 28, fontWeight: 800, color: k.c }}>{k.v}</b>
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{k.sub}</span>
          </Link>
        ))}
      </div>

      <div className={s.cols}>
        {can("Agenda") && (
          <section className={s.card}>
            <div className={s.cardHead}>
              <b style={{ fontSize: 17 }}>Citas de hoy</b>
              <Link href="/intranet/agenda" style={{ fontSize: 13, fontWeight: 700 }}>Ver agenda</Link>
            </div>
            {todays.length === 0 && <div className={s.empty}>No hay citas para hoy.</div>}
            {todays.map((a) => {
              const [bg, fg] = tone(a.st);
              const doc = docs.find((d) => d.id === a.doc)?.name ?? "";
              return (
                <Link key={a.id} href="/intranet/agenda" className={s.row}>
                  <b className="tnum" style={{ width: 52, fontSize: 14 }}>{hm(a.slot)}</b>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{a.p}</b>
                    <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{a.s} · {doc}</div>
                  </div>
                  <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: bg, color: fg }}>{STATUS_LABEL[a.st]}</span>
                </Link>
              );
            })}
          </section>
        )}
        {alerts.length > 0 && (
          <section className={s.card}>
            <div className={s.cardHead}><b style={{ fontSize: 17 }}>Requiere atención</b></div>
            {alerts.map((a) => (
              <Link key={a.t} href={a.h} className={s.row} style={{ padding: "14px 22px" }}>
                <Icon name={a.icon} style={{ color: a.c }} />
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 14 }}>{a.t}</b>
                  <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{a.sub}</div>
                </div>
                <Icon name="chevron-right" style={{ color: "var(--ink-500)" }} />
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
