"use client";
import { useSyncExternalStore } from "react";
import { isRemote } from "@/lib/backend/config";
import { useSiteReadyStore } from "@/lib/backend/sync";

/**
 * Mientras no haya datos reales de la clínica (modo remoto) muestra una pantalla neutra: así el visitante no ve ni un
 * instante el nombre, los colores o los textos de ejemplo.
 */
export default function PublicGate({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(useSiteReadyStore.subscribe, useSiteReadyStore.get, useSiteReadyStore.get);
  if (!isRemote || ready) return <>{children}</>;
  return (
    <div role="status" aria-label="Cargando" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#9ca3af", animation: "da-spin .8s linear infinite" }} />
      <style>{"@keyframes da-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
