"use client";
import { useRef, useState } from "react";
import { type BulkMatResult, MAT_TEMPLATE, applyMaterials, parseMaterialSheet } from "@/lib/bulk-materials";
import { modStore, saveMod, uid } from "@/lib/mod";
import { Actions, ChipField, SheetSub } from "./kit";

/** Carga masiva de materiales al inventario desde Excel: plantilla, vista previa con avisos e importación. */
export function BulkMaterials({ onDone }: { onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState("");
  const [res, setRes] = useState<BulkMatResult | null>(null);
  const [mode, setMode] = useState<"Sumar al stock" | "Reemplazar stock">("Sumar al stock");
  const [busy, setBusy] = useState(false);

  async function template() {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const head = MAT_TEMPLATE.head.map((value) => ({ value, fontWeight: "bold" as const, backgroundColor: "#E6F4EF" }));
    const data = [head, ...MAT_TEMPLATE.rows.map((r) => r.map((value) => (typeof value === "number" ? { value, type: Number } : { value: String(value) })))];
    const blob = await writeXlsxFile([{ data, sheet: "Materiales", columns: [{ width: 18 }, { width: 40 }, { width: 12 }, { width: 12 }, { width: 24 }, { width: 24 }] }]).toBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "plantilla-materiales.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function read(f: File) {
    setBusy(true);
    setFile(f.name);
    try {
      const { default: readXlsxFile } = await import("read-excel-file");
      const sheet = (await readXlsxFile(f)) as unknown[][];
      setRes(parseMaterialSheet(sheet, modStore.get().inv));
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

  function run() {
    if (!rows.length) return;
    const prev = modStore.get();
    const out = applyMaterials(prev.inv, rows, mode === "Sumar al stock" ? "sumar" : "reemplazar", uid);
    saveMod({ ...prev, inv: out.inv }, `${out.created} productos creados · ${out.updated} actualizados`, prev);
    onDone();
  }

  return (
    <>
      <SheetSub sub="Sube un Excel con las columnas Producto, Unidad y Cantidad (opcionales: Código, Stock mínimo y Vencimiento). Los productos nuevos reciben un código MAT-###; los que ya existen (mismo código o nombre) se actualizan." />
      <input ref={input} type="file" accept=".xlsx" aria-label="Archivo de Excel" hidden onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
      <ChipField label="Si el producto ya existe" value={mode} options={["Sumar al stock", "Reemplazar stock"] as const} onChange={setMode} />
      <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>{mode === "Sumar al stock" ? "La cantidad del Excel se registra como una entrada (compra o reposición)." : "La cantidad del Excel pasa a ser el stock actual (conteo de inventario)."}</div>
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
          <div role="status" style={{ fontSize: 14, fontWeight: 700 }}>{rows.length} productos: {news} nuevos · {upd} por actualizar</div>
          <div style={{ maxHeight: 340, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((r) => (
              <div key={r.line} className="tnum" style={{ display: "flex", gap: 8, justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, boxShadow: "inset 0 0 0 1px var(--line)", fontSize: 13 }}>
                <span style={{ minWidth: 0 }}>
                  <b>{r.name}</b>
                  <span style={{ display: "block", color: "var(--ink-500)", fontSize: 12 }}>{r.action === "nuevo" ? "Nuevo" : "Actualiza"}{r.min !== undefined ? ` · mínimo ${r.min}` : ""}{r.venc ? ` · vence ${r.venc}` : ""}{r.notes.length ? ` · ${r.notes.join("; ")}` : ""}</span>
                </span>
                <b style={{ whiteSpace: "nowrap" }}>{mode === "Sumar al stock" && r.action === "actualizar" ? "+" : ""}{r.qty} {r.unit}</b>
              </div>
            ))}
          </div>
          <Actions items={[{ t: `Importar ${rows.length} productos`, kind: "p", icon: "check", run }]} />
        </>
      )}
    </>
  );
}
