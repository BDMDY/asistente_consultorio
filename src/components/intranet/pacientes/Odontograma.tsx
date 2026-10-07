"use client";
import { useState } from "react";
import { type Dentition, ODO_ARCH, ODO_GLYPH, ODO_GLYPH_COLOR, ODO_SURF_BG, ODO_SURF_HINT, ODO_SURF_NAME, ODO_TOOLS, ODO_WHOLE_BG, ODO_WHOLE_LABEL, type Surface, type Teeth, type Tool, addNote, applyTool, isUpper, odontogramFindings, odontogramStore, surfaceMap, toothName } from "@/lib/clinical";
import { todayISO } from "@/lib/dates";
import type { Patient } from "@/lib/patients";
import { themeStore } from "@/lib/theme";
import { toast } from "@/lib/toast";
import s from "./pac.module.css";

const segBtn = (on: boolean): React.CSSProperties => ({ cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: 0, fontFamily: "inherit", background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)" });
const cellBg = (th: Teeth[string] | undefined, k: Surface) => (th?.w ? ODO_WHOLE_BG[th.w] : th?.s[k] ? ODO_SURF_BG[th.s[k]!] : "var(--surface)") ?? "var(--surface)";
const POS = [["top", "T"], ["left", "L"], ["center", "C"], ["right", "R"], ["bottom", "B"]] as const;
const AREA = { top: "1 / 2", left: "2 / 1", center: "2 / 2", right: "2 / 3", bottom: "3 / 2" } as const;

export function Odontograma({ p, onSaved }: { p: Patient; onSaved: () => void }) {
  const [all] = odontogramStore.useStore();
  const [theme] = themeStore.useStore();
  const [tool, setTool] = useState<Tool>("caries");
  const [den, setDen] = useState<Dentition>("perm");
  const [sel, setSel] = useState(16);
  const teeth: Teeth = all[p.id]?.t ?? {};
  const [upper, lower] = ODO_ARCH[den];
  const selN = [...upper, ...lower].includes(sel) ? sel : upper[2];
  const thSel = teeth[selN];
  const mSel = surfaceMap(selN);
  const { list, grp } = odontogramFindings(teeth);
  const onTxt = theme === "dark" ? "#10241B" : "#fff";

  const save = (t: Teeth) => odontogramStore.update((a) => ({ ...a, [p.id]: { t, at: Date.now() } }));
  function apply(num: number, surf?: Surface) {
    setSel(num);
    const r = applyTool(teeth, num, surf, tool);
    if (r.error) return toast(r.error);
    save(r.teeth);
  }
  function setNote(n: string) {
    const th: Teeth[string] = teeth[selN] ? { ...teeth[selN] } : { s: {}, w: null, n: "" };
    th.n = n;
    save({ ...teeth, [selN]: th });
  }
  function saveSummary() {
    const keys = Object.keys(grp);
    if (!keys.length) return toast("Marca al menos un hallazgo");
    addNote(p.id, "Odontograma actualizado · " + keys.map((k) => `${k}: ${grp[k].join(", ")}`).join(" · "), todayISO());
    onSaved();
    toast("Resumen guardado en la historia clínica");
  }

  const toothView = (num: number, i: number, half: number) => {
    const th = teeth[num], m = surfaceMap(num), up = isUpper(num);
    return (
      <div key={num} className={i === half ? s.toothGap : undefined} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: up ? "column" : "column-reverse", alignItems: "center", gap: 3 }}>
        <span className={`tnum ${s.toothNum}`} style={{ color: th ? "var(--ink-900)" : "var(--ink-500)" }}>{num}</span>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gridTemplateRows: "repeat(3,minmax(0,1fr))", gap: 1, padding: 2, boxSizing: "border-box", borderRadius: 6, boxShadow: selN === num ? "0 0 0 2px var(--brand-500)" : "none", containerType: "inline-size" }}>
          {POS.map(([pos]) => (
            <button key={pos} type="button" aria-label={`Diente ${num}, ${ODO_SURF_NAME[m[pos]]}`} onClick={() => apply(num, m[pos])}
              style={{ gridArea: AREA[pos], cursor: "pointer", borderRadius: 2, background: cellBg(th, m[pos]), boxShadow: "inset 0 0 0 1px var(--line)", minWidth: 0, minHeight: 0, padding: 0, border: 0 }} />
          ))}
          <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "62cqw", fontWeight: 800, lineHeight: 1, color: th?.w ? ODO_GLYPH_COLOR[th.w] : "transparent" }}>{th?.w ? ODO_GLYPH[th.w] : ""}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <b style={{ fontSize: 16, flex: 1, minWidth: 160 }}>Odontograma</b>
        <div style={{ display: "flex", gap: 6 }}>
          {([["Permanente (adulto)", "perm", 16], ["Temporal (niño)", "temp", 55]] as const).map(([t, k, n]) => <button key={k} type="button" aria-pressed={den === k} style={segBtn(den === k)} onClick={() => { setDen(k); setSel(n); }}>{t}</button>)}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>Herramienta activa · toca una superficie del diente para marcarla</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ODO_TOOLS.map(([k, t, c, , g]) => (
          <button key={k} type="button" aria-pressed={tool === k} onClick={() => setTool(k)} style={{ cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: 0, fontFamily: "inherit", color: "var(--ink-900)", background: tool === k ? "var(--brand-50)" : "var(--surface)", boxShadow: tool === k ? "inset 0 0 0 2px var(--brand-500)" : "inset 0 0 0 1px var(--line)" }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: c, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff" }}>{g}</span>{t}
          </button>
        ))}
      </div>

      <div style={{ borderRadius: 14, boxShadow: "inset 0 0 0 1px var(--line)", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[upper, lower].map((arr, ri) => (
          <div key={ri} className={s.toothRow} style={{ maxWidth: arr.length * 54 + 20, borderTop: ri ? "1px solid var(--line)" : "none", paddingTop: ri ? 8 : 0 }}>
            {arr.map((n, i) => toothView(n, i, arr.length / 2))}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 12px", borderRadius: 14, background: "var(--brand-50)", display: "flex", flexDirection: "column", gap: 6 }}>
        <b style={{ fontSize: 13 }}>Cómo leer las letras</b>
        <div className={s.g2} style={{ gap: "4px 16px" }}>
          {(Object.keys(ODO_SURF_NAME) as Surface[]).map((k) => (
            <div key={k} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, lineHeight: 1.35 }}>
              <b style={{ minWidth: 16, fontSize: 13, color: "var(--brand-text)" }}>{k}</b><span><b>{ODO_SURF_NAME[k]}</b> · {ODO_SURF_HINT[k]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={s.edGrid} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 12, padding: "10px 12px", borderRadius: 14, boxShadow: "inset 0 0 0 1px var(--line)", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <b style={{ fontSize: 13, textAlign: "center" }}>{toothName(selN, den)}</b>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3,36px)", gridTemplateRows: "repeat(3,36px)", gap: 2 }}>
            {POS.map(([pos]) => {
              const k = mSel[pos], on = !!(thSel && (thSel.w || thSel.s[k]));
              return <button key={pos} type="button" aria-label={`${ODO_SURF_NAME[k]} (${k})`} onClick={() => apply(selN, k)} style={{ gridArea: AREA[pos], cursor: "pointer", borderRadius: 8, background: cellBg(thSel, k), color: on ? onTxt : "var(--ink-500)", boxShadow: "inset 0 0 0 1px var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, border: 0, padding: 0, fontFamily: "inherit" }}>{k}</button>;
            })}
            <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: thSel?.w ? ODO_GLYPH_COLOR[thSel.w] : "transparent" }}>{thSel?.w ? ODO_GLYPH[thSel.w] : ""}</span>
          </div>
          <span style={{ fontSize: 12, color: "var(--ink-500)", textAlign: "center" }}>
            {thSel?.w ? `Marcado: ${ODO_WHOLE_LABEL[thSel.w]}` : thSel && Object.keys(thSel.s).length ? `${Object.keys(thSel.s).length} superficie(s) marcada(s)` : "Diente sano o sin registro"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label className={s.field}>Nota del diente
            <input value={thSel?.n ?? ""} onChange={(e) => setNote(e.target.value)} placeholder="Ej. sensibilidad al frío, control en 3 meses" aria-label="Nota del diente" className={s.input} />
          </label>
          <button type="button" onClick={() => { const nt = { ...teeth }; delete nt[selN]; save(nt); toast(`Diente ${selN} limpiado`); }} style={{ cursor: "pointer", alignSelf: "flex-start", minHeight: 42, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, boxShadow: "inset 0 0 0 1px var(--line)", fontWeight: 700, fontSize: 13, background: "transparent", border: 0, color: "inherit", fontFamily: "inherit" }}>Limpiar este diente</button>
          <b style={{ fontSize: 14, marginTop: 6 }}>Hallazgos · {list.length}</b>
          {list.map((f) => <div key={f.t} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: f.c }} /><span className="tnum">{f.t}</span></div>)}
          {list.length === 0 && <span style={{ fontSize: 13, color: "var(--ink-500)" }}>Sin hallazgos marcados.</span>}
          <button type="button" onClick={saveSummary} style={{ cursor: "pointer", alignSelf: "flex-start", minHeight: 44, display: "flex", alignItems: "center", padding: "0 16px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 14, border: 0, fontFamily: "inherit" }}>Guardar resumen en la historia clínica</button>
        </div>
      </div>
    </>
  );
}
