import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | undefined;

export function getClient(): SupabaseClient {
  return (client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
}

/** Mensaje en español para errores de la base de datos o de las funciones públicas. */
export function errText(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? "";
  if (e?.code === "23P01" || msg.includes("appointments_no_overlap") || msg.includes("slot_taken")) return "Ese horario ya fue ocupado";
  if (e?.code === "42501" || /row-level security|permission denied/i.test(msg)) return "No tienes permiso para esta acción";
  if (msg.includes("Debe quedar al menos un administrador")) return "Debe quedar al menos un administrador activo";
  if (e?.code === "23505") return "Ya existe un registro con esos datos";
  if (/fetch|network/i.test(msg)) return "Sin conexión con el servidor";
  return msg || "Ocurrió un error";
}
