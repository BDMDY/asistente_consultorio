// COPIA AUTOMÁTICA DIARIA a Backblaze B2 (compatible con S3).
// Lee los datos de cada clínica, los cifra con BACKUP_PASSPHRASE (mismo formato que el respaldo manual de la app y que
// scripts/descifrar-respaldo.mjs) y los sube a B2. Cada ejecución queda registrada en la tabla backup_runs.
// La llama el programador de Supabase (pg_cron) con el encabezado x-backup-secret; sin él responde 401.
//
// Secretos de la función (Supabase → Edge Functions → Secrets): B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT
// (por ejemplo https://s3.us-west-004.backblazeb2.com) y BACKUP_PASSPHRASE (la clave de cifrado: guárdala aparte, sin ella no se abre la copia).
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptBackup } from "./crypto.ts";
import { putObject } from "./sigv4.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });
const TABLES: [string, string[]][] = [
  ["patients", ["id"]], ["appointments", ["date", "slot"]], ["payments", ["id"]], ["patient_records", ["patient_id", "kind"]],
  ["clinical_notes", ["id"]], ["patient_files", ["id"]], ["outbox", ["id"]], ["staff", ["created_at"]], ["clinic_docs", ["key"]],
];
const PAGE = 1000;

Deno.serve(async (req) => {
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const ok = await db.rpc("backup_secret_ok", { p: req.headers.get("x-backup-secret") ?? "" });
  if (ok.error || ok.data !== true) return json({ error: "unauthorized" }, 401);

  const keyId = Deno.env.get("B2_KEY_ID"), appKey = Deno.env.get("B2_APP_KEY"), bucket = Deno.env.get("B2_BUCKET");
  // Se acepta con o sin «https://», con espacios o con una barra final: se normaliza a https://s3.<región>.backblazeb2.com
  const rawEndpoint = (Deno.env.get("B2_ENDPOINT") ?? "").trim().replace(/^https?:\/\//i, "").split("/")[0];
  const endpoint = rawEndpoint ? `https://${rawEndpoint}` : "", pass = Deno.env.get("BACKUP_PASSPHRASE");
  const log = (r: Record<string, unknown>) => db.from("backup_runs").insert(r);
  if (!keyId || !appKey || !bucket || !endpoint || !pass) {
    await log({ ok: false, error: "Falta configurar los secretos de la copia automática (B2_KEY_ID, B2_APP_KEY, B2_BUCKET, B2_ENDPOINT o BACKUP_PASSPHRASE)" });
    return json({ error: "not_configured" }, 503);
  }
  const region = /^https:\/\/s3\.([^.]+)\.backblazeb2\.com$/.exec(endpoint)?.[1];
  if (!region) {
    await log({ ok: false, error: "B2_ENDPOINT no tiene el formato https://s3.<región>.backblazeb2.com" });
    return json({ error: "bad_endpoint" }, 500);
  }

  const { data: clinics, error: ce } = await db.from("clinics").select("*");
  if (ce) { await log({ ok: false, error: "No se pudo leer la lista de clínicas" }); return json({ error: "db" }, 500); }
  const results: unknown[] = [];
  for (const clinic of clinics ?? []) {
    try {
      const tables: Record<string, unknown[]> = {};
      for (const [t, order] of TABLES) {
        const rows: unknown[] = [];
        for (let from = 0; ; from += PAGE) {
          let q = db.from(t).select("*").eq("clinic_id", clinic.id);
          for (const o of order) q = q.order(o);
          const { data, error } = await q.range(from, from + PAGE - 1);
          if (error) throw new Error(`No se pudo leer ${t}: ${error.message}`);
          rows.push(...(data ?? []));
          if (!data || data.length < PAGE) break;
        }
        tables[t] = rows;
      }
      const body = new TextEncoder().encode(await encryptBackup(JSON.stringify({ app: "DentAssist", version: 1, createdAt: new Date().toISOString(), clinic, tables }), pass));
      const file = `${clinic.slug}/respaldo-${new Date().toISOString().slice(0, 10)}.cifrado.json`;
      await putObject({ endpoint, region, bucket, key: file, body, accessKey: keyId, secretKey: appKey, contentType: "application/json" });
      await log({ clinic_id: clinic.id, ok: true, file, bytes: body.length, counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])) });
      results.push({ clinic: clinic.slug, file, bytes: body.length });
    } catch (e) {
      await log({ clinic_id: clinic.id, ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 500) });
      results.push({ clinic: clinic.slug, error: true });
    }
  }
  return json({ results });
});
