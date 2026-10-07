"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { modStore } from "@/lib/mod";
import { canAccess, permsStore } from "@/lib/perms";
import { currentUser, sessionStore } from "@/lib/session";

/** Muestra el contenido solo si el rol del usuario tiene acceso al módulo; si no, vuelve al inicio. */
export default function Guard({ perm, children }: { perm: string; children: React.ReactNode }) {
  const router = useRouter();
  const [session] = sessionStore.useStore();
  const [mod] = modStore.useStore();
  const [perms] = permsStore.useStore();
  const user = currentUser(session, mod);
  const allowed = canAccess(perms, user?.rol, perm);
  useEffect(() => {
    if (user && !allowed) router.replace("/intranet/inicio");
  }, [user, allowed, router]);
  return allowed ? <>{children}</> : null;
}
