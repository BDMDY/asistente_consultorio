// Invita por correo a una persona ya registrada en el personal de la clínica (solo administradores).
// La persona recibe un enlace para crear su contraseña; al confirmar, un disparador la vincula a su ficha.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
    const { email, redirectTo } = (await req.json()) as { email?: string; redirectTo?: string };
    if (!token || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "bad_request" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: who, error: ue } = await admin.auth.getUser(token);
    if (ue || !who.user) return json({ error: "unauthorized" }, 401);

    // Quien invita debe ser administrador activo, y la persona invitada debe estar registrada en el personal de su misma clínica.
    const { data: me } = await admin.from("staff").select("clinic_id").eq("user_id", who.user.id).eq("active", true).eq("rol", "Administrador");
    const clinics = (me ?? []).map((r) => r.clinic_id);
    if (!clinics.length) return json({ error: "forbidden" }, 403);
    const { data: target } = await admin.from("staff").select("id, user_id").in("clinic_id", clinics).eq("active", true).ilike("mail", email).limit(1).maybeSingle();
    if (!target) return json({ error: "not_staff" }, 404);
    if (target.user_id) return json({ error: "already_linked" }, 409);

    const { error } = await admin.auth.admin.inviteUserByEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return json({ error: "already_registered" }, 409);
      if (/rate limit|too many/i.test(error.message)) return json({ error: "rate_limited" }, 429);
      return json({ error: "send_failed", detail: error.message }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: "server", detail: String(e) }, 500);
  }
});
