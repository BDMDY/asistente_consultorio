"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMod } from "@/lib/mod";
import { canAccess, permsStore } from "@/lib/perms";
import { currentUser, sessionStore } from "@/lib/session";
import { Configuracion } from "./Configuracion";
import { Finanzas } from "./Finanzas";
import { Inventario } from "./Inventario";
import { Mensajes } from "./Mensajes";
import { Planes } from "./Planes";
import { Reportes } from "./Reportes";
import { Servicios } from "./Servicios";

export const MODULES: Record<string, { perm: string; View: React.ComponentType }> = {
  planes: { perm: "Planes de tratamiento", View: Planes },
  inventario: { perm: "Inventario", View: Inventario },
  finanzas: { perm: "Finanzas", View: Finanzas },
  servicios: { perm: "Servicios", View: Servicios },
  mensajes: { perm: "Mensajes y campañas", View: Mensajes },
  reportes: { perm: "Reportes", View: Reportes },
  configuracion: { perm: "Configuración", View: Configuracion },
};

/** Elige el módulo por la ruta y aplica los permisos del rol. */
export default function Modulo({ slug }: { slug: string }) {
  const router = useRouter();
  const { data } = useMod();
  const [session] = sessionStore.useStore();
  const [perms] = permsStore.useStore();
  const user = currentUser(session, data);
  const mod = MODULES[slug];
  const allowed = !!mod && canAccess(perms, user?.rol, mod.perm);

  useEffect(() => {
    if (user && !allowed) router.replace("/intranet/inicio");
  }, [user, allowed, router]);

  if (!mod || !allowed) return null;
  return <mod.View />;
}
