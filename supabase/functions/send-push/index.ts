// NOTIFICACIONES PUSH al personal cuando entra una reserva desde la web — preparada, NO desplegada todavía.
//
// Para activarla:
//  1. Generar claves VAPID:  npx web-push generate-vapid-keys
//  2. Vercel: variable NEXT_PUBLIC_VAPID_PUBLIC_KEY = la clave pública (y volver a publicar el sitio).
//  3. Supabase → Edge Functions → Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo) y PUSH_SECRET (un texto largo al azar).
//  4. Desplegar esta función con verify_jwt=false.
//  5. Supabase → Database → Webhooks: nuevo webhook sobre la tabla `appointments`, evento INSERT, tipo «Supabase Edge Functions» (o HTTP)
//     hacia esta función, con el encabezado `x-push-secret` igual a PUSH_SECRET.
// Cada persona activa los avisos de su dispositivo en Configuración → Notificaciones → «Avisos en este dispositivo».
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const DAY_START_MIN = 9 * 60, SLOT_MIN = 15; // el tramo 0 es las 09:00 y cada tramo dura 15 min
const hm = (slot: number) => { const m = DAY_START_MIN + slot * SLOT_MIN; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_SECRET"), pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!secret || !pub || !priv) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-push-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => null)) as { type?: string; table?: string; record?: Record<string, unknown> } | null;
  const r = body?.record;
  if (!r || body?.type !== "INSERT" || body?.table !== "appointments" || r.web !== true) return json({ skipped: true });

  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com", pub, priv);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth").eq("clinic_id", r.clinic_id as string);

  const payload = JSON.stringify({
    title: "Nueva reserva web",
    body: `${r.patient_name} · ${r.service} · ${r.date} ${hm(Number(r.slot))}`,
    url: "/intranet/agenda",
    tag: `cita-${r.id}`,
  });
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // dispositivo dado de baja
    }
  }
  return json({ sent });
});
