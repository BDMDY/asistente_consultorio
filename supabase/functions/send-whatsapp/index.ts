// ENVÍO AUTOMÁTICO DE WHATSAPP (WhatsApp Cloud API de Meta) — preparado, NO desplegado todavía.
//
// Qué hace: toma de la cola (`outbox`) los avisos de WhatsApp pendientes que tengan celular, los envía con
// una plantilla aprobada por Meta y los marca como enviados.
//
// Para activarlo hace falta:
//  1. Cuenta de Meta Business verificada y un número exclusivo en WhatsApp Business (Cloud API).
//  2. Una plantilla aprobada por Meta por tipo de aviso (ver TEMPLATES), con 1 variable en el cuerpo ({{1}} = el texto del aviso).
//  3. Secretos de la función: WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, CRON_SECRET
//     (y opcional WHATSAPP_TEMPLATES con un JSON {"cancelacion":"nombre_plantilla", ...} para cambiar los nombres).
//  4. Desplegar con verify_jwt=false y llamarla con el encabezado `x-cron-secret` desde un cron (por ejemplo cada 5 min).
import { createClient } from "npm:@supabase/supabase-js@2";

const TEMPLATES: Record<string, string> = {
  cancelacion: "aviso_cancelacion",
  reprogramacion: "aviso_reprogramacion",
  recordatorio: "recordatorio_cita",
  demora: "aviso_demora",
  cobranza: "recordatorio_pago",
  comprobante: "envio_comprobante",
  ...JSON.parse(Deno.env.get("WHATSAPP_TEMPLATES") ?? "{}"),
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  const token = Deno.env.get("WHATSAPP_TOKEN"), phoneId = Deno.env.get("WHATSAPP_PHONE_ID"), secret = Deno.env.get("CRON_SECRET");
  if (!token || !phoneId || !secret) return json({ error: "not_configured" }, 503);
  if (req.headers.get("x-cron-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: rows, error } = await db.from("outbox").select("clinic_id, id, kind, phone, text")
    .eq("status", "en-cola").eq("channel", "whatsapp").not("phone", "is", null).neq("kind", "campana").order("at").limit(50);
  if (error) return json({ error: "db" }, 500);

  let sent = 0, failed = 0;
  for (const r of rows ?? []) {
    const template = TEMPLATES[r.kind];
    const to = String(r.phone).replace(/\D/g, "");
    if (!template || to.length < 11) { failed++; continue; }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: { name: template, language: { code: "es" }, components: [{ type: "body", parameters: [{ type: "text", text: String(r.text).slice(0, 1000) }] }] },
      }),
    });
    if (res.ok) {
      await db.from("outbox").update({ status: "enviado" }).eq("clinic_id", r.clinic_id).eq("id", r.id);
      sent++;
    } else failed++;
  }
  return json({ sent, failed });
});
