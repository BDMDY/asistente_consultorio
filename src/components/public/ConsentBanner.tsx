"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { useMounted } from "@/lib/hooks";
import { defineStore } from "@/lib/store";
import s from "./consent.module.css";

export type Consent = { choice: "all" | "necessary"; at: string };
/** Elección de privacidad del visitante del sitio público (Ley 29733). */
export const consentStore = defineStore<Consent | null>("da-consent-v1", () => null);

export default function ConsentBanner() {
  const mounted = useMounted();
  const pathname = usePathname();
  const [consent, setConsent] = consentStore.useStore();
  // En la reserva y "Mi cita" no se muestra: no debe tapar los botones de acción (la reserva pide su propio consentimiento).
  if (!mounted || consent || pathname.startsWith("/reserva") || pathname.startsWith("/mi-cita")) return null;
  const choose = (choice: Consent["choice"]) => setConsent({ choice, at: new Date().toISOString() });
  return (
    <div role="region" aria-label="Aviso de privacidad" className={s.banner}>
      <span className={s.icon}><Icon name="shield-check" /></span>
      <div className={s.text}>
        <b>Cuidamos tus datos.</b> Usamos tus datos personales solo para gestionar tu cita, según la Ley 29733 de Protección de Datos Personales.{" "}
        <Link href="/privacidad">Aviso de privacidad</Link>
      </div>
      <div className={s.actions}>
        <button type="button" className={s.ghost} onClick={() => choose("necessary")}>Solo necesarias</button>
        <button type="button" className={s.primary} onClick={() => choose("all")}>Aceptar</button>
      </div>
    </div>
  );
}
