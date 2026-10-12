// Registro del personal con código de acceso: valida correo + DNI + código, crea la cuenta ya confirmada
// (un disparador la vincula a su ficha de personal) y consume el código.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { email, dni, code, password } = (await req.json()) as { email?: string; dni?: string; code?: string; password?: string };
    if (!email || !dni || !code || !password) return json({ error: "bad_request" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const { data: staffId, error: ce } = await admin.rpc("check_staff_code", { p_email: email, p_dni: dni, p_code: code });
    if (ce) return json({ error: "server" }, 500);
    if (!staffId) return json({ error: "invalid" }, 403); // mismo mensaje para cualquier dato incorrecto

    const { error } = await admin.auth.admin.createUser({ email: email.trim(), password, email_confirm: true });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return json({ error: "already_registered" }, 409);
      return json({ error: "weak_password", detail: error.message }, 422);
    }
    await admin.rpc("consume_staff_code", { p_staff: staffId });
    return json({ ok: true });
  } catch (e) {
    return json({ error: "server", detail: String(e) }, 500);
  }
});
