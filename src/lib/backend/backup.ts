"use client";
import { encryptBackup } from "../backup-crypto";
import { getClient } from "./client";

type Row = Record<string, unknown>;

/** Tablas de la clínica que entran al respaldo (con el orden de lectura). No incluye nada de seguridad: claves, códigos ni suscripciones. */
const TABLES: [string, string[]][] = [
  ["patients", ["id"]], ["appointments", ["date", "slot"]], ["payments", ["id"]], ["patient_records", ["patient_id", "kind"]],
  ["clinical_notes", ["id"]], ["patient_files", ["id"]], ["outbox", ["id"]], ["staff", ["created_at"]], ["clinic_docs", ["key"]],
];
const PAGE = 1000;

export interface BackupData { app: "DentAssist"; version: 1; createdAt: string; clinic: Row | null; tables: Record<string, Row[]> }

async function clinicOf(): Promise<string> {
  const db = getClient();
  const uid = (await db.auth.getUser()).data.user?.id;
  const { data } = await db.from("staff").select("clinic_id").eq("user_id", uid ?? "").eq("active", true).eq("rol", "Administrador").limit(1).maybeSingle();
  if (!data?.clinic_id) throw new Error("Solo un administrador puede descargar el respaldo");
  return data.clinic_id as string;
}

/** Lee todas las tablas de la clínica (con las reglas de acceso del usuario). */
export async function collectBackup(onProgress?: (done: number, total: number) => void): Promise<BackupData> {
  const db = getClient();
  const clinicId = await clinicOf();
  const tables: Record<string, Row[]> = {};
  let n = 0;
  for (const [t, order] of TABLES) {
    const out: Row[] = [];
    for (let from = 0; ; from += PAGE) {
      let q = db.from(t).select("*").eq("clinic_id", clinicId);
      for (const o of order) q = q.order(o);
      const { data, error } = await q.range(from, from + PAGE - 1);
      if (error) throw new Error(`No se pudo leer «${t}»: ${error.message}`);
      out.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) break;
    }
    tables[t] = out;
    onProgress?.(++n, TABLES.length);
  }
  const { data: clinic } = await db.from("clinics").select("*").eq("id", clinicId).maybeSingle();
  return { app: "DentAssist", version: 1, createdAt: new Date().toISOString(), clinic: (clinic as Row | null) ?? null, tables };
}

const stamp = () => new Date().toISOString().slice(0, 10);
const download = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
};

/** Respaldo completo (JSON), cifrado si se indica una contraseña. Devuelve el resumen para mostrarlo. */
export async function downloadBackup(pass: string, onProgress?: (done: number, total: number) => void): Promise<{ file: string; counts: Record<string, number> }> {
  const data = await collectBackup(onProgress);
  const json = JSON.stringify(data);
  const body = pass ? await encryptBackup(json, pass) : json;
  const file = `respaldo-dentalmavila-${stamp()}${pass ? ".cifrado" : ""}.json`;
  download(new Blob([body], { type: "application/json" }), file);
  try { localStorage.setItem("da-last-backup", new Date().toISOString()); } catch { /* sin almacenamiento */ }
  return { file, counts: Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.length])) };
}

const sheet = (rows: Row[], cols: [string, string][]) => {
  const head = cols.map(([, h]) => ({ value: h, fontWeight: "bold" as const, backgroundColor: "#E6F4EC", textColor: "#0B4D2C" }));
  const body = rows.map((r) => cols.map(([k]) => { const v = r[k]; return typeof v === "number" ? { value: v, type: Number } : { value: Array.isArray(v) ? v.join(", ") : v == null ? "" : typeof v === "boolean" ? (v ? "Sí" : "No") : String(v), type: String }; }));
  return [head, ...body];
};

/** Libro de Excel legible (pacientes, citas, cobros y personal). No se cifra: avisar a quien lo descarga. */
export async function downloadExcel(onProgress?: (done: number, total: number) => void): Promise<string> {
  const d = await collectBackup(onProgress);
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const w = (n: number) => ({ width: n });
  const sheets = [
    { sheet: "Pacientes", data: sheet(d.tables.patients, [["name", "Nombre"], ["dni", "DNI"], ["phone", "Celular"], ["email", "Correo"], ["alerts", "Alertas"], ["created_at", "Alta"]]), columns: [w(34), w(12), w(14), w(28), w(24), w(22)] },
    { sheet: "Citas", data: sheet(d.tables.appointments, [["date", "Fecha"], ["slot", "Tramo"], ["patient_name", "Paciente"], ["service", "Servicio"], ["status", "Estado"], ["phone", "Celular"], ["notes", "Notas"]]), columns: [w(12), w(8), w(30), w(26), w(14), w(14), w(30)] },
    { sheet: "Cobros", data: sheet(d.tables.payments, [["no", "Comprobante"], ["at", "Fecha"], ["patient", "Paciente"], ["concept", "Concepto"], ["amount", "Monto (S/)"], ["method", "Método"]]), columns: [w(16), w(22), w(30), w(34), w(12), w(14)] },
    { sheet: "Personal", data: sheet(d.tables.staff, [["nom", "Nombre"], ["dni", "DNI"], ["mail", "Correo"], ["tel", "Celular"], ["rol", "Perfil"], ["active", "Activo"]]), columns: [w(32), w(12), w(30), w(14), w(16), w(8)] },
  ];
  const file = `datos-dentalmavila-${stamp()}.xlsx`;
  download(await writeXlsxFile(sheets).toBlob(), file);
  return file;
}

export const lastBackup = (): string | null => { try { return localStorage.getItem("da-last-backup"); } catch { return null; } };
