"use client";
import { useRef, useState } from "react";
import { type BulkResult, BULK_TEMPLATE, applyBulk, parseServiceSheet } from "@/lib/bulk-services";
import { mediaStore, resolveMedia } from "@/lib/media";
import { money0 } from "@/lib/mod";
import { toast } from "@/lib/toast";
import { Actions, ChipField, SheetSub } from "./kit";

/** Carga masiva de tratamientos desde Excel: plantilla, vista previa con avisos e importación. */
export function BulkServices({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState("");
  const [res, setRes] = useState<BulkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [vis, setVis] = useState<"Solo uso interno" | "En el sitio y la reserva web">("Solo uso interno");

  async function template() {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const head = BULK_TEMPLATE.head.map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E6F4EF" }));
    const data = [head, ...BULK_TEMPLATE.rows.map((r) => r.map((value) => (typeof value === "number" ? { value, type: Number } : { value: String(value) })))];
    const blob = await writeXlsxFile([{ data, sheet: "Tratamientos", columns: [{ width: 18 }, { width: 44 }, { width: 18 }, { width: 24 }, { width: 12 }, { width: 22 }, { width: 50 }] }]).toBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla-tratamientos.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function read(f: File) {
    setBusy(true);
    setFile(f.name);
    try {
      const { default: readXlsxFile } = await import("read-excel-file");
      const sheet = (await readXlsxFile(f)) as unknown[][];
      setRes(parseServiceSheet(sheet, resolveMedia(mediaStore.get()).services));
    } catch {
      setRes({ rows: [], errors: ["No pude leer el archivo. Sube un Excel .xlsx (puedes guardar tu hoja como «Libro de Excel»)."] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const rows = res?.rows ?? [];
  const news = rows.filter((r) => r.action === "nuevo").length;
  const upd = rows.length - news;
  const noPrice = rows.filter((r) => r.price === null).length;

  function run() {
    if (!res || !rows.length) return;
    const out = applyBulk(resolveMedia(mediaStore.get()).services, rows, { web: vis === "En el sitio y la reserva web" });
    mediaStore.update((m) => ({ ...m, services: out.services }));
    toast(`${out.created} creados · ${out.updated} actualizados`);
    onDone();
  }

  return (
    <>
      <SheetSub sub="Sube un Excel con las columnas Tratamiento, Precio y Sesiones (opcionales: Código, Pago inicial, Duración y Descripción). El precio es el total del tratamiento; si tiene pago inicial, cada sesión vale (precio − inicial) ÷ sesiones. Los tratamientos nuevos reciben un código TRT-###; los que ya existen (mismo código o nombre) se actualizan." />
      <input ref={input} type="file" accept=".xlsx" aria-label="Archivo de Excel" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      <ChipField label="Los tratamientos nuevos serán" value={vis} options={["Solo uso interno", "En el sitio y la reserva web"] as const} onChange={setVis} />
      <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>Recomendado: importarlos como uso interno y luego elegir cuáles se muestran con «Seleccionar». Los que ya existen conservan su visibilidad.</div>
      <Actions items={[
        { t: busy ? "Leyendo…" : file ? `Cambiar archivo (${file})` : "Elegir archivo de Excel", kind: res ? "" : "p", icon: "upload", run: () => input.current?.click() },
        { t: "Descargar plantilla", icon: "download", run: template },
      ]} />
      {res && res.errors.length > 0 && (
        <div role="alert" style={{ fontSize: 13, lineHeight: 1.5, padding: "10px 12px", borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)" }}>
          {res.errors.map((e) => <div key={e}>· {e}</div>)}
        </div>
      )}
      {rows.length > 0 && (
        <>
          <div role="status" style={{ fontSize: 14, fontWeight: 700 }}>{rows.length} tratamientos: {news} nuevos · {upd} por actualizar{noPrice ? ` · ${noPrice} sin precio` : ""}</div>
          <div style={{ maxHeight: 340, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <div key={r.line} className="tnum" style={{ display: "flex", gap: 8, justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 13 }}>
                <span style={{ minWidth: 0 }}>
                  <b>{r.name}</b>
                  <span style={{ display: "block", color: "var(--ink-500)", fontSize: 12 }}>{r.action === "nuevo" ? "Nuevo" : "Actualiza"} · {r.sessions} {r.sessions === 1 ? "sesión" : "sesiones"}{r.initial ? ` · inicial ${money0(r.initial)}` : ""}{r.price !== null && r.sessions > 1 ? ` · ${money0(Math.round(((r.price - (r.initial ?? 0)) / r.sessions) * 100) / 100)} por sesión` : ""}{r.notes.length ? ` · ${r.notes.join("; ")}` : ""}</span>
                </span>
                <b style={{ whiteSpace: "nowrap", color: r.price === null ? "var(--warning-fg)" : undefined }}>{r.price === null ? "Sin precio" : money0(r.price)}</b>
              </div>
            ))}
          </div>
          <Actions items={[{ t: `Importar ${rows.length} tratamientos`, kind: "p", icon: "check", run }]} />
        </>
      )}
    </>
  );
}
