import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgendaState } from "../agenda";
import type { Anamnesis, ClinicalNote, Odontogram, PatientFile, TreatmentPlan } from "../clinical";
import type { PublicDoctor } from "../doctors";
import { type ModData, type StaffUser, emptyMod } from "../mod";
import type { OutboxItem } from "../outbox";
import type { Patient } from "../patients";
import { type PermRow, seedPerms } from "../perms";
import type { Payment } from "../payments";
import {
  type Row, apptToRow, diffById, fileToRow, flatten, groupByPatient, noteToRow, outboxToRow, patientToRow, paymentToRow,
  rowToAppt, rowToFile, rowToNote, rowToOutbox, rowToPatient, rowToPayment,
} from "./rows";
import { type Ctx, defineSpec } from "./sync";

const PAGE = 1000;

/** Lee toda una tabla de la empresa (PostgREST devuelve como máximo 1000 filas por consulta). */
export async function fetchAll(db: SupabaseClient, table: string, clinicId: string, order: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select("*").eq("clinic_id", clinicId);
    for (const o of order) q = q.order(o);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (!data || data.length < PAGE) return out;
  }
}

const ok = ({ error }: { error: unknown }) => {
  if (error) throw error;
};

/** Escribe solo lo que cambió entre dos listas con identificador numérico (o texto). */
async function syncList<T>(c: Ctx, table: string, prev: T[], next: T[], id: (t: T) => string | number, toRow: (t: T) => Row) {
  const { upsert, remove } = diffById(prev, next, id);
  if (upsert.length) ok(await c.db.from(table).upsert(upsert.map(toRow), { onConflict: "clinic_id,id" }));
  if (remove.length) ok(await c.db.from(table).delete().eq("clinic_id", c.clinicId).in("id", remove));
}

async function syncByPatient<T extends { id: number }>(c: Ctx, table: string, prev: Record<number, T[]>, next: Record<number, T[]>, toRow: (pid: number, t: T) => Row) {
  const a = flatten(prev), b = flatten(next);
  const key = (x: { pid: number; item: T }) => x.pid + ":" + x.item.id;
  const { upsert, remove } = diffById(a, b, key);
  if (upsert.length) ok(await c.db.from(table).upsert(upsert.map((x) => toRow(x.pid, x.item)), { onConflict: "clinic_id,id" }));
  const ids = remove.map((k) => Number(String(k).split(":")[1]));
  if (ids.length) ok(await c.db.from(table).delete().eq("clinic_id", c.clinicId).in("id", ids));
}

async function readDoc(c: Ctx, key: string): Promise<unknown> {
  const { data, error } = await c.db.from("clinic_docs").select("value").eq("clinic_id", c.clinicId).eq("key", key).maybeSingle();
  if (error) throw error;
  return data?.value;
}
async function writeDoc(c: Ctx, key: string, value: unknown) {
  ok(await c.db.from("clinic_docs").upsert({ clinic_id: c.clinicId, key, value }, { onConflict: "clinic_id,key" }));
}

/** Documento de empresa: brand, media, perms. */
function docSpec<T>(key: string, empty: () => T, publicKey?: "brand" | "media"): void {
  defineSpec<T>(key, {
    tables: ["clinic_docs"],
    load: async (c) => ((await readDoc(c, key)) as T | undefined) ?? empty(),
    save: (_prev, next, c) => writeDoc(c, key, next),
    ...(publicKey ? { fromPublic: (site) => (site[publicKey] as T | null) ?? empty() } : {}),
  });
}

/** Un registro por paciente en patient_records (anamnesis, odontograma, plan). */
function recordSpec<V>(name: string, kind: "anamnesis" | "odontogram" | "plan") {
  defineSpec<Record<number, V>>(name, {
    tables: ["patient_records"],
    load: async (c) => {
      const rows = await fetchAll(c.db, "patient_records", c.clinicId, ["patient_id", "kind"]);
      const out: Record<number, V> = {};
      for (const r of rows) if (r.kind === kind) out[Number(r.patient_id)] = r.value as V;
      return out;
    },
    save: async (prev, next, c) => {
      const ids = new Set([...Object.keys(prev), ...Object.keys(next)]);
      for (const k of ids) {
        const a = prev[Number(k)], b = next[Number(k)];
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        if (b === undefined) ok(await c.db.from("patient_records").delete().eq("clinic_id", c.clinicId).eq("patient_id", Number(k)).eq("kind", kind));
        else ok(await c.db.from("patient_records").upsert({ clinic_id: c.clinicId, patient_id: Number(k), kind, value: b }, { onConflict: "clinic_id,patient_id,kind" }));
      }
    },
  });
}

const staffToRow = (c: string, u: StaffUser): Row => ({ id: u.id, clinic_id: c, nom: u.nom, dni: u.dni, cmp: u.cmp, mail: u.mail, tel: u.tel, rol: u.rol, active: u.on, agenda_id: u.agenda ?? null });
const rowToStaff = (r: Row): StaffUser => ({ id: r.id as string, nom: r.nom as string, dni: r.dni as string, cmp: (r.cmp as string) ?? "", mail: r.mail as string, tel: (r.tel as string) ?? "", rol: r.rol as StaffUser["rol"], on: !!r.active, ...(r.agenda_id != null ? { agenda: Number(r.agenda_id) } : {}) });

let registered = false;
/** Registra todos los adaptadores (una sola vez). */
export function registerSpecs() {
  if (registered) return;
  registered = true;

  defineSpec<Patient[]>("patients", {
    tables: ["patients"],
    load: async (c) => (await fetchAll(c.db, "patients", c.clinicId, ["name", "id"])).map(rowToPatient),
    save: (prev, next, c) => syncList(c, "patients", prev, next, (p) => p.id, (p) => patientToRow(c.clinicId, p)),
  });

  defineSpec<AgendaState>("agenda", {
    tables: ["appointments"],
    load: async (c) => ({ appts: (await fetchAll(c.db, "appointments", c.clinicId, ["date", "slot", "id"])).map(rowToAppt), nid: 0 }),
    save: (prev, next, c) => syncList(c, "appointments", prev.appts, next.appts, (a) => a.id, (a) => apptToRow(c.clinicId, a)),
  });

  defineSpec<Payment[]>("payments", {
    tables: ["payments"],
    load: async (c) => (await fetchAll(c.db, "payments", c.clinicId, ["at", "id"])).map(rowToPayment),
    save: (prev, next, c) => syncList(c, "payments", prev, next, (p) => p.id, (p) => paymentToRow(c.clinicId, p)),
  });

  defineSpec<OutboxItem[]>("outbox", {
    tables: ["outbox"],
    load: async (c) => (await fetchAll(c.db, "outbox", c.clinicId, ["at", "id"])).map(rowToOutbox),
    save: (prev, next, c) => syncList(c, "outbox", prev, next, (o) => o.id, (o) => outboxToRow(c.clinicId, o)),
  });

  defineSpec<Record<number, ClinicalNote[]>>("notes", {
    tables: ["clinical_notes"],
    load: async (c) => {
      const rows = await fetchAll(c.db, "clinical_notes", c.clinicId, ["id"]);
      return groupByPatient(rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id)), rowToNote);
    },
    save: (prev, next, c) => syncByPatient(c, "clinical_notes", prev, next, (pid, n) => noteToRow(c.clinicId, pid, n)),
  });

  defineSpec<Record<number, PatientFile[]>>("files", {
    tables: ["patient_files"],
    load: async (c) => groupByPatient(await fetchAll(c.db, "patient_files", c.clinicId, ["id"]), rowToFile),
    save: (prev, next, c) => syncByPatient(c, "patient_files", prev, next, (pid, f) => fileToRow(c.clinicId, pid, f)),
  });

  recordSpec<Anamnesis>("anamnesis", "anamnesis");
  recordSpec<Odontogram>("odontogram", "odontogram");
  recordSpec<TreatmentPlan>("plans", "plan");

  // Doctores que ve el sitio público (sin sesión): vienen en la respuesta de public_site.
  defineSpec<PublicDoctor[]>("pubdoctors", {
    tables: [],
    load: async () => [],
    save: async () => {},
    fromPublic: (site) => ((site.doctors as { id: number; nom: string; cmp: string }[] | undefined) ?? []).map((d) => ({ id: Number(d.id), nom: d.nom, cmp: d.cmp ?? "" })),
  });

  docSpec<Record<string, unknown>>("brand", () => ({}), "brand");
  docSpec<Record<string, unknown>>("media", () => ({}), "media");
  docSpec<PermRow[]>("perms", seedPerms);

  // Módulos: un documento (planes, inventario, finanzas…) + el personal, que vive en su propia tabla.
  defineSpec<ModData>("mod", {
    tables: ["clinic_docs", "staff"],
    load: async (c) => {
      const doc = ((await readDoc(c, "mod")) as Partial<ModData> | undefined) ?? {};
      const { data, error } = await c.db.from("staff").select("*").eq("clinic_id", c.clinicId).order("created_at");
      if (error) throw error;
      return { ...emptyMod(), ...doc, users: (data as Row[]).map(rowToStaff) };
    },
    save: async (prev, next, c) => {
      const { users: pu, ...pd } = prev;
      const { users: nu, ...nd } = next;
      if (JSON.stringify(pd) !== JSON.stringify(nd)) await writeDoc(c, "mod", nd);
      const { upsert, remove } = diffById(pu, nu, (u) => u.id);
      if (upsert.length) ok(await c.db.from("staff").upsert(upsert.map((u) => staffToRow(c.clinicId, u)), { onConflict: "id" }));
      if (remove.length) ok(await c.db.from("staff").delete().eq("clinic_id", c.clinicId).in("id", remove));
    },
  });
}
