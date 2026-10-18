import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MiCita from "@/components/public/MiCita";
import { CLINIC_SLUG, SUPABASE_KEY, SUPABASE_URL, isRemote } from "@/lib/backend/config";

export const metadata: Metadata = { title: "Mi cita" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ¿Existe una cita con ese enlace? Solo se comprueba la existencia: los datos de la cita no se envían desde el servidor. */
async function existe(token: string): Promise<boolean> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/public_appointment`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_token: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return true; // si el servidor no responde, la pantalla lo resuelve en el navegador
    return (await r.json()) !== null;
  } catch {
    return true;
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Con la base conectada, un enlace mal formado o que no corresponde a ninguna cita responde 404 (no una pantalla vacía con 200).
  if (isRemote && CLINIC_SLUG && (!UUID.test(id) || !(await existe(id)))) notFound();
  return <MiCita id={id} />;
}
