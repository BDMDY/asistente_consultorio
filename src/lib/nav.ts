import type { IconName } from "@/components/ui/Icon";

export interface NavItem { label: string; href: string; icon: IconName; mobileIcon?: IconName; module?: string }

const M = "/intranet/modulos/";

/** Secciones de la intranet. `module` enlaza con la matriz de permisos (Inicio siempre visible). */
export const NAV: NavItem[] = [
  { label: "Inicio", href: "/intranet/inicio", icon: "layout-dashboard", mobileIcon: "house" },
  { label: "Agenda", href: "/intranet/agenda", icon: "calendar-days", module: "Agenda" },
  { label: "Pacientes", href: "/intranet/pacientes", icon: "users", module: "Pacientes" },
  { label: "Planes de tratamiento", href: M + "planes", icon: "clipboard-list", module: "Planes de tratamiento" },
  { label: "Inventario", href: M + "inventario", icon: "package", module: "Inventario" },
  { label: "Finanzas", href: M + "finanzas", icon: "wallet", module: "Finanzas" },
  { label: "Servicios", href: M + "servicios", icon: "stethoscope", module: "Servicios" },
  { label: "Mensajes y campañas", href: M + "mensajes", icon: "message-circle", module: "Mensajes y campañas" },
  { label: "Reportes", href: M + "reportes", icon: "chart-column", module: "Reportes" },
  { label: "Configuración", href: M + "configuracion", icon: "settings", module: "Configuración" },
];

export const MOBILE_TABS = [NAV[0], NAV[1], NAV[2]];

export function navTitle(pathname: string): string {
  const hit = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));
  if (hit) return hit.label;
  if (pathname.startsWith("/intranet/configuracion")) return "Configuración";
  return "DentAssist";
}
