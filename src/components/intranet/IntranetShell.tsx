"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import Icon, { type IconName } from "@/components/ui/Icon";
import { agendaStore } from "@/lib/agenda-store";
import { refreshData, useAuth } from "@/lib/backend/auth";
import { useMounted, useToday } from "@/lib/hooks";
import { initialsOf, modStore, pendingCharges, stockLow } from "@/lib/mod";
import { MOBILE_TABS, NAV, navTitle } from "@/lib/nav";
import { canAccess, permsStore } from "@/lib/perms";
import { currentUser, sedeStore, sessionStore, signOut } from "@/lib/session";
import { toast } from "@/lib/toast";
import Toaster from "./Toaster";
import s from "./shell.module.css";

type Pop = null | { kind: "notif" | "perfil"; mode: "rail" | "top" };

export default function IntranetShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useMounted();
  const today = useToday();
  const auth = useAuth();
  const [session] = sessionStore.useStore();
  const [mod] = modStore.useStore();
  const [perms] = permsStore.useStore();
  const [{ appts }] = agendaStore.useStore();
  const [sede, setSede] = sedeStore.useStore();
  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState<Pop>(null);
  const [pwd, setPwd] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);

  const user = currentUser(session, mod);

  useEffect(() => {
    const settled = auth.status === "off" || auth.status === "ready" || auth.status === "anon" || auth.status === "denied";
    if (mounted && settled && !user) router.replace("/intranet");
  }, [mounted, user, router, auth.status]);

  // Cada vez que se entra a un módulo se actualizan los datos desde el servidor (modo remoto).
  useEffect(() => {
    if (auth.status === "ready") void refreshData();
  }, [pathname, auth.status]);

  // Los menús se cierran al elegir un enlace y con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        setPop(null);
        setPwd(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (drawer) drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
  }, [drawer]);

  if (!mounted || !user) return null;

  const items = NAV.filter((n) => !n.module || canAccess(perms, user.rol, n.module));
  const current = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const low = stockLow(mod);
  const pend = pendingCharges(mod);
  const unconfirmed = appts.filter((a) => a.date === today && a.st === "pendiente").length;
  const ini = initialsOf(user.nom);
  const sedes = mod.sedes.map((z) => z.n);

  function logout() {
    signOut();
    router.replace("/intranet");
  }

  const popLink = (icon: IconName, color: string, title: string, sub: string, href: string) => (
    <Link key={href + title} href={href} className={s.popRow} onClick={() => setPop(null)}>
      <Icon name={icon} style={{ color }} />
      <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{sub}</span>
      </span>
    </Link>
  );

  const popStyle = (): React.CSSProperties =>
    pop?.mode === "rail"
      ? { left: 72, [pop.kind === "perfil" ? "bottom" : "bottom"]: pop.kind === "perfil" ? 12 : 70 }
      : { top: 60, right: 8 };

  return (
    <div className={s.shell}>
      <aside className={s.rail} aria-label="Navegación de la intranet">
        <button type="button" className={s.iconBtn} aria-label="Abrir menú" aria-expanded={drawer} onClick={() => setDrawer(true)}><Icon name="menu" size={22} /></button>
        <nav className={s.railNav} aria-label="Secciones">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className={s.railLink} title={n.label} aria-label={n.label} aria-current={current(n.href) ? "page" : undefined}>
              <Icon name={n.icon} />
            </Link>
          ))}
        </nav>
        <div className={s.railBottom}>
          <ThemeToggle style={{ borderRadius: 12 }} />
          <button type="button" className={s.iconBtn} aria-label="Notificaciones" onClick={() => setPop(pop?.kind === "notif" ? null : { kind: "notif", mode: "rail" })}>
            <Icon name="bell" />
            <span className={s.dot} />
          </button>
          <button type="button" className={s.avatar} aria-label="Perfil" title={`${user.nom} · ${user.rol}`} onClick={() => setPop(pop?.kind === "perfil" ? null : { kind: "perfil", mode: "rail" })}>{ini}</button>
        </div>
      </aside>

      <header className={s.topbar}>
        <button type="button" className={s.iconBtn} aria-label="Abrir menú" onClick={() => setDrawer(true)}><Icon name="menu" size={22} /></button>
        <b className={s.topTitle}>{navTitle(pathname)}</b>
        <ThemeToggle style={{ borderRadius: 12 }} />
        <button type="button" className={s.iconBtn} aria-label="Notificaciones" onClick={() => setPop(pop?.kind === "notif" ? null : { kind: "notif", mode: "top" })}>
          <Icon name="bell" />
          <span className={s.dot} />
        </button>
        <button type="button" className={s.avatar} style={{ width: 36, height: 36, margin: "0 6px 0 0" }} aria-label="Perfil" onClick={() => setPop(pop?.kind === "perfil" ? null : { kind: "perfil", mode: "top" })}>{ini}</button>
      </header>

      <main className={s.main}>{children}</main>

      <nav className={s.tabs} aria-label="Navegación principal">
        {MOBILE_TABS.filter((n) => !n.module || canAccess(perms, user.rol, n.module)).map((n) => (
          <Link key={n.href} href={n.href} className={s.tab} aria-current={current(n.href) ? "page" : undefined}>
            <Icon name={n.mobileIcon ?? n.icon} />
            {n.label}
          </Link>
        ))}
      </nav>

      {drawer && (
        <>
          <div className={s.backdrop} onClick={() => setDrawer(false)} />
          <aside ref={drawerRef} className={s.drawer} role="dialog" aria-modal="true" aria-label="Menú">
            <div className={s.drawerHead}>
              <span style={{ flex: 1 }}><BrandMark size="sm" /></span>
              <button type="button" className={s.iconBtn} aria-label="Cerrar menú" onClick={() => setDrawer(false)}><Icon name="x" /></button>
            </div>
            {sedes.length > 1 && (
              <button type="button" className={s.sede} onClick={() => { const next = sedes[(sedes.indexOf(sede) + 1) % sedes.length]; setSede(next); toast(`Sede activa: ${next}`); }} aria-label={`Sede activa: ${sede}. Cambiar de sede`}>
                <Icon name="building-2" size={18} />
                <span style={{ flex: 1 }}>{sede}</span>
                <Icon name="chevron-down" size={16} />
              </button>
            )}
            {items.map((n) => (
              <Link key={n.href} href={n.href} className={s.drawerLink} aria-current={current(n.href) ? "page" : undefined} onClick={() => setDrawer(false)}>
                <Icon name={n.icon} size={18} />
                {n.label}
              </Link>
            ))}
            <div className={s.drawerFoot}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "0 8px" }}>
                <span className={s.avatar} style={{ width: 44, height: 44, margin: 0, cursor: "default" }}>{ini}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{user.nom}</b>
                  <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{user.rol} · DNI {user.dni}</span>
                </span>
              </div>
              <button type="button" className={s.drawerLink} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--error-fg)", fontFamily: "inherit" }} onClick={logout}>
                <Icon name="log-out" size={18} />Cerrar sesión
              </button>
            </div>
          </aside>
        </>
      )}

      {pop && (
        <>
          <div className={s.popBack} onClick={() => setPop(null)} />
          <div className={s.pop} style={popStyle()} role="dialog" aria-label={pop.kind === "notif" ? "Notificaciones" : "Perfil"}>
            {pop.kind === "notif" ? (
              <>
                <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: 16 }}>Notificaciones</b>
                  <Link href="/intranet/modulos/configuracion" style={{ fontSize: 13, fontWeight: 700 }} onClick={() => setPop(null)}>Ajustes</Link>
                </div>
                {popLink("package", "var(--error-fg)", `${low.length} productos con stock bajo`, low.slice(0, 2).map((i) => i.n).join(", ") || "Todo en orden", "/intranet/modulos/inventario")}
                {popLink("wallet", "var(--warning-fg)", `${pend.length} cobros pendientes`, "Registra el pago o envía recordatorio", "/intranet/modulos/finanzas")}
                {popLink("message-circle", "var(--warning-fg)", `${unconfirmed} citas sin confirmar hoy`, "Envía el recordatorio por WhatsApp", "/intranet/agenda")}
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 16 }}>
                  <span className={s.avatar} style={{ width: 44, height: 44, margin: 0, cursor: "default" }}>{ini}</span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <b>{user.nom}</b>
                    <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{user.rol} · DNI {user.dni}</span>
                  </span>
                </div>
                <button type="button" className={s.popRow} onClick={() => { setPop(null); setPwd(true); }} style={{ fontWeight: 600 }}><Icon name="key-round" />Cambiar contraseña</button>
                <button type="button" className={s.popRow} onClick={logout} style={{ fontWeight: 600, color: "var(--error-fg)" }}><Icon name="log-out" />Cerrar sesión</button>
              </>
            )}
          </div>
        </>
      )}

      {pwd && <PasswordModal onClose={() => setPwd(false)} />}
      <Toaster />
    </div>
  );
}

function PasswordModal({ onClose }: { onClose: () => void }) {
  const [v, setV] = useState({ a: "", b: "", c: "" });
  const [err, setErr] = useState("");
  const field = (k: "a" | "b" | "c", label: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700 }}>
      {label}
      <input type="password" autoComplete="off" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} style={{ minHeight: 44, borderRadius: 10, border: "1px solid var(--line)", padding: "0 12px", fontSize: 15, background: "var(--surface)", color: "inherit" }} />
    </label>
  );
  function save() {
    const e = !v.a ? "Escribe tu contraseña actual" : v.b.length < 8 ? "La nueva contraseña debe tener al menos 8 caracteres" : v.b !== v.c ? "Las contraseñas no coinciden" : "";
    setErr(e);
    if (!e) {
      onClose();
      toast("Contraseña actualizada");
    }
  }
  return (
    <div className={s.modalBack} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Cambiar contraseña" onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", color: "var(--ink-900)", borderRadius: 16, padding: 22, width: "min(380px,100%)", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <b style={{ fontSize: 18 }}>Cambiar contraseña</b>
        {field("a", "Contraseña actual")}
        {field("b", "Nueva contraseña (mín. 8 caracteres)")}
        {field("c", "Repetir nueva contraseña")}
        <div role="alert" style={{ color: "var(--error-fg)", fontSize: 13, minHeight: 16 }}>{err}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ all: "unset", cursor: "pointer", minHeight: 44, padding: "0 16px", display: "flex", alignItems: "center", fontWeight: 700 }}>Cancelar</button>
          <button type="button" onClick={save} style={{ all: "unset", cursor: "pointer", minHeight: 44, padding: "0 20px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
