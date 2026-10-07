"use client";
import { useState } from "react";
import { CloseBtn, Modal, Notice, Segmented, btnOutline, btnPrimary, chipStyle, fieldStyle, labelStyle } from "@/components/ui/kit";
import { type Appt, type SeriesRule, SLOTS, checkReschedule, clash, freeStarts, generateSeries, hm, isClosedDay, slotOf } from "@/lib/agenda";
import { CANCEL_REASONS, type NewApptForm, cancelAppt, chargeAppt, createAppts, priceFor, rescheduleAppt, validateNew } from "@/lib/agenda-actions";
import { agendaStore } from "@/lib/agenda-store";
import { labelShort, weekday, WEEKDAYS_SHORT } from "@/lib/dates";
import { type Doctor, serviceDuration, useMedia } from "@/lib/media";
import { PAY_METHODS, type PayMethod, type Payment, money } from "@/lib/payments";
import { patientsStore } from "@/lib/patients";
import { toast } from "@/lib/toast";
import { useBrand } from "@/lib/brand";

const DURS = [1, 2, 3, 4, 6, 8];
const FREQS: ["weekly" | "biweekly" | "monthly", string][] = [["weekly", "Semanal"], ["biweekly", "Cada 2 semanas"], ["monthly", "Mensual"]];
const WD_BUTTONS: [string, number][] = [["L", 1], ["M", 2], ["X", 3], ["J", 4], ["V", 5], ["S", 6], ["D", 0]];

const timeChip = (on: boolean): React.CSSProperties => chipStyle(on, { padding: "10px 14px", fontSize: 14 });

// ───────────────────────── Nueva cita / serie ─────────────────────────

export function NewApptDialog({ today, docs, initial, sheet, onClose, onCreated }: {
  today: string;
  docs: Doctor[];
  initial: { mode: "single" | "series"; date: string; doc: number; time: string; patient: string };
  sheet: boolean;
  onClose: () => void;
  onCreated: (firstDate: string) => void;
}) {
  const media = useMedia();
  const [{ appts }] = agendaStore.useStore();
  const [patients] = patientsStore.useStore();
  const services = media.services.length ? media.services : [{ id: 0, name: "Consulta", desc: "", price: "" }];

  const [mode, setMode] = useState(initial.mode);
  const [f, setF] = useState<NewApptForm & { picked: boolean }>({
    patient: initial.patient, picked: !!initial.patient, isNew: false, svc: services[0].name, doc: initial.doc,
    date: initial.date, time: initial.time, dur: serviceDuration(0), notes: "",
  });
  const [rule, setRule] = useState<SeriesRule>({
    freq: "weekly", days: [0, 1, 2, 3, 4, 5, 6].map((d) => d === weekday(initial.date)), endMode: "count", count: 5, until: "", onClash: "skip",
  });
  const patch = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const rpatch = (p: Partial<SeriesRule>) => setRule((x) => ({ ...x, ...p }));

  const slot = slotOf(f.time);
  const err = validateNew(appts, f, mode, rule, today);
  const series = mode === "series";
  const q = f.patient.trim().toLowerCase();
  const matches = patients.filter((p) => q && (p.name.toLowerCase().includes(q) || p.dni.includes(q))).slice(0, 4);
  const exact = patients.some((p) => p.name.toLowerCase() === q);
  const free = freeStarts(appts, f.date, f.doc, f.dur).slice(0, 12);
  const hit = slot !== null ? clash(appts, { date: f.date, doc: f.doc, slot, dur: f.dur }) : null;
  const plan = series && slot !== null ? generateSeries(appts, { date: f.date, slot, doc: f.doc, dur: f.dur }, rule) : [];
  const okN = plan.filter((x) => x.status !== "skip").length;
  const docName = docs.find((d) => d.id === f.doc)?.name ?? "";

  let avail: { tone: "success" | "warning" | "error"; icon: "circle-check" | "triangle-alert" | "circle-x" | "clock"; msg: string };
  if (isClosedDay(f.date)) avail = { tone: "warning", icon: "triangle-alert", msg: "Los domingos no hay atención." };
  else if (slot === null) avail = { tone: "warning", icon: "clock", msg: "Elige una hora entre 09:00 y 16:45 en tramos de 15 min." };
  else if (slot + f.dur > SLOTS) avail = { tone: "warning", icon: "clock", msg: "La cita terminaría después de las 17:00." };
  else if (hit) avail = { tone: "error", icon: "circle-x", msg: `Choca con ${hit.p} (${hm(hit.slot)}–${hm(hit.slot + hit.dur)}). Elige otro horario.` };
  else avail = { tone: "success", icon: "circle-check", msg: `Horario libre · ${docName} · ${hm(slot)}–${hm(slot + f.dur)}` };

  function create() {
    if (err) return;
    const r = createAppts(f, mode, rule);
    toast(mode === "single" ? `Cita creada · ${f.patient.trim()} · ${f.time}` : `${r.created.length} citas creadas para ${f.patient.trim()}${r.skipped ? ` · ${r.skipped} omitida(s)` : ""}`, r.undo);
    onCreated(r.created[0]?.date ?? f.date);
    onClose();
  }

  const left = (
    <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ position: "relative" }}>
        <label style={labelStyle}>Paciente
          <input value={f.patient} onChange={(e) => patch({ patient: e.target.value, picked: false, isNew: false })} placeholder="Buscar por nombre o DNI, o escribir uno nuevo" style={{ ...fieldStyle, height: 46, fontSize: 15 }} autoComplete="off" />
        </label>
        {!!q && !f.picked && (
          <div style={{ position: "absolute", left: 0, right: 0, top: 74, background: "var(--surface)", borderRadius: 12, boxShadow: "var(--shadow-lg)", zIndex: 5, overflow: "hidden" }}>
            {matches.map((p) => (
              <button key={p.id} type="button" onClick={() => patch({ patient: p.name, picked: true, isNew: false })} style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "var(--ink-900)", border: 0, borderTop: "1px solid var(--line)", background: "transparent", fontFamily: "inherit" }}>
                {p.name}{p.dni && <span className="tnum" style={{ color: "var(--ink-500)", fontWeight: 500 }}> · DNI {p.dni}</span>}
              </button>
            ))}
            {!exact && (
              <button type="button" onClick={() => patch({ picked: true, isNew: true })} style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "var(--brand-700)", border: 0, borderTop: "1px solid var(--line)", background: "transparent", fontFamily: "inherit" }}>
                + Crear paciente nuevo «{f.patient.trim()}»
              </button>
            )}
          </div>
        )}
        {f.isNew && <span style={{ display: "inline-block", marginTop: 6, padding: "3px 9px", borderRadius: 999, background: "var(--info-bg)", color: "var(--info-fg)", fontSize: 12, fontWeight: 700 }}>Paciente nuevo · se creará su ficha</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>Servicio
          <select value={f.svc} onChange={(e) => { const i = services.findIndex((s) => s.name === e.target.value); patch({ svc: e.target.value, dur: serviceDuration(Math.max(0, i)) }); }} style={fieldStyle}>
            {services.map((s, i) => <option key={s.id} value={s.name}>{s.name} · {serviceDuration(i) * 15} min</option>)}
          </select>
        </label>
        <label style={labelStyle}>Doctor
          <select value={f.doc} onChange={(e) => patch({ doc: +e.target.value })} style={fieldStyle}>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label style={labelStyle}>{series ? "Primera fecha" : "Fecha"}
          <input type="date" value={f.date} min={today} onChange={(e) => patch({ date: e.target.value })} style={fieldStyle} />
        </label>
        <label style={labelStyle}>Hora
          <input type="time" step={900} min="09:00" max="16:45" value={f.time} onChange={(e) => patch({ time: e.target.value })} style={fieldStyle} />
        </label>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Duración</div>
        <Segmented label="Duración" options={DURS.map((n) => [n, `${n * 15} min`] as [number, string])} value={f.dur} onChange={(n) => patch({ dur: n })} />
      </div>

      {series && (
        <div style={{ padding: 14, borderRadius: 14, background: "var(--brand-50)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Se repite</div><Segmented label="Frecuencia" options={FREQS} value={rule.freq} onChange={(v) => rpatch({ freq: v })} /></div>
          {rule.freq !== "monthly" && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Días de la semana</div>
              <div role="group" aria-label="Días de la semana" style={{ display: "flex", gap: 6 }}>
                {WD_BUTTONS.map(([t, wd]) => (
                  <button key={t} type="button" aria-pressed={rule.days[wd]} aria-label={WEEKDAYS_SHORT[wd]} onClick={() => rpatch({ days: rule.days.map((v, k) => (k === wd ? !v : v)) })} style={chipStyle(rule.days[wd], { flex: 1, padding: "10px 0" })}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Termina</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}><Segmented label="Fin de la serie" options={[["count", "Tras N citas"], ["date", "En una fecha"]]} value={rule.endMode} onChange={(v) => rpatch({ endMode: v })} /></div>
              {rule.endMode === "count"
                ? <input type="number" min={2} max={30} aria-label="Número de citas" value={rule.count} onChange={(e) => rpatch({ count: +e.target.value })} style={{ ...fieldStyle, width: 80, height: 42 }} />
                : <input type="date" aria-label="Hasta" value={rule.until} onChange={(e) => rpatch({ until: e.target.value })} style={{ ...fieldStyle, width: 150, height: 42 }} />}
            </div>
          </div>
          <div><div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Si una fecha choca con otra cita</div><Segmented label="Choques" options={[["skip", "Omitir esa fecha"], ["move", "Mover al siguiente hueco"]]} value={rule.onClash} onChange={(v) => rpatch({ onClash: v })} /></div>
        </div>
      )}

      <label style={labelStyle}>Notas (opcional)
        <input value={f.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Ej. paciente con ansiedad, traer radiografías" style={fieldStyle} />
      </label>
    </div>
  );

  const right = (
    <div style={{ padding: "22px 28px", background: "var(--muted)", display: "flex", flexDirection: "column", gap: 12 }}>
      {!series ? (
        <>
          <Notice tone={avail.tone} icon={avail.icon}>{avail.msg}</Notice>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>Otros horarios libres ese día · {docName}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {free.map((s) => <button key={s} type="button" className="tnum" onClick={() => patch({ time: hm(s) })} style={timeChip(hm(s) === f.time)}>{hm(s)}</button>)}
          </div>
          {free.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-500)" }}>No quedan huecos de esa duración. Prueba otro día o doctor.</div>}
        </>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 15 }}>Vista previa</b>
            <span style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600 }}>{plan.length ? `${okN} de ${plan.length} fechas disponibles` : ""}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", borderRadius: 12, overflow: "hidden" }}>
            {plan.map((r) => {
              const c = r.status === "ok" ? "success" : r.status === "moved" ? "warning" : "error";
              return (
                <div key={r.date} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderTop: "1px solid var(--line)", fontSize: 13 }}>
                  <span className="tnum" style={{ flex: 1, fontWeight: 600 }}>{labelShort(r.date)} · {hm(r.slot)}</span>
                  <span style={{ fontSize: 12, color: r.status === "skip" ? "var(--error-fg)" : r.status === "moved" ? "var(--warning-fg)" : "var(--ink-500)", fontWeight: 600 }}>{r.note ?? "Libre"}</span>
                  <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: `var(--${c}-bg)`, color: `var(--${c}-fg)` }}>{r.status === "ok" ? "OK" : r.status === "moved" ? "Movida" : "Omitida"}</span>
                </div>
              );
            })}
          </div>
          {plan.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-500)" }}>Elige fecha, hora y días para ver las citas.</div>}
        </>
      )}
    </div>
  );

  return (
    <Modal onClose={onClose} width={960} label="Nueva cita" sheet={sheet}>
      <div style={{ padding: "20px 28px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <b style={{ fontSize: 22 }}>Nueva cita</b>
        <div style={{ display: "flex", background: "var(--muted)", borderRadius: 12, padding: 4 }} role="group" aria-label="Tipo de cita">
          {([["single", "Cita única"], ["series", "En serie"]] as const).map(([v, t]) => (
            <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} style={{ cursor: "pointer", border: 0, padding: "9px 18px", borderRadius: 9, fontSize: 14, fontWeight: 700, fontFamily: "inherit", background: mode === v ? "var(--surface)" : "transparent", color: mode === v ? "var(--brand-700)" : "var(--ink-500)", boxShadow: mode === v ? "var(--shadow-sm)" : "none" }}>{t}</button>
          ))}
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: sheet ? "minmax(0,1fr)" : "1.25fr 1fr" }}>{left}{right}</div>
      <div style={{ padding: "16px 28px", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span role="alert" style={{ flex: 1, minWidth: 160, fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{err}</span>
        <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
        <button type="button" onClick={create} disabled={!!err} style={btnPrimary(!err)}>{series ? `Crear ${okN || ""} citas` : "Crear cita"}</button>
      </div>
    </Modal>
  );
}

// ───────────────────────── Reprogramar ─────────────────────────

export function RescheduleDialog({ a, today, docs, sheet, onClose, onDone }: { a: Appt; today: string; docs: Doctor[]; sheet: boolean; onClose: () => void; onDone: (date: string) => void }) {
  const [{ appts }] = agendaStore.useStore();
  const [r, setR] = useState({ date: a.date >= today ? a.date : today, time: hm(a.slot), doc: a.doc });
  const slot = slotOf(r.time);
  const check = checkReschedule(appts, a, { date: r.date, slot, doc: r.doc }, today);
  const free = freeStarts(appts, r.date, r.doc, a.dur, { ignoreId: a.id }).slice(0, 14);
  const docName = docs.find((d) => d.id === r.doc)?.name ?? "";

  function confirm() {
    if (!check.ok || slot === null) return;
    const old = `${labelShort(a.date)} ${hm(a.slot)}`;
    rescheduleAppt(a, { date: r.date, slot, doc: r.doc });
    toast(`Cita reprogramada: ${old} → ${labelShort(r.date)} ${hm(slot)}`);
    onDone(r.date);
    onClose();
  }

  return (
    <Modal onClose={onClose} width={600} label="Reprogramar cita" sheet={sheet}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><b style={{ fontSize: 22 }}>Reprogramar cita</b><div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>{a.p} · actual: {labelShort(a.date)} {hm(a.slot)}</div></div>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: sheet ? "1fr" : "1fr 1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>Nueva fecha<input type="date" min={today} value={r.date} onChange={(e) => setR({ ...r, date: e.target.value })} style={fieldStyle} /></label>
          <label style={labelStyle}>Nueva hora<input type="time" step={900} min="09:00" max="16:45" value={r.time} onChange={(e) => setR({ ...r, time: e.target.value })} style={fieldStyle} /></label>
          <label style={labelStyle}>Doctor<select value={r.doc} onChange={(e) => setR({ ...r, doc: +e.target.value })} style={fieldStyle}>{docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        </div>
        {check.ok
          ? <Notice tone="success" icon="circle-check">Horario libre · {docName} · {labelShort(r.date)} {hm(slot!)}–{hm(slot! + a.dur)}</Notice>
          : <Notice tone={check.conflict ? "error" : "warning"} icon={check.conflict ? "circle-x" : "clock"}>{check.error}</Notice>}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>Horarios libres ese día · {docName}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {free.map((s) => <button key={s} type="button" className="tnum" onClick={() => setR({ ...r, time: hm(s) })} style={timeChip(hm(s) === r.time)}>{hm(s)}</button>)}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
          <button type="button" onClick={confirm} disabled={!check.ok} style={btnPrimary(check.ok)}>Confirmar nuevo horario</button>
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────── Cancelar ─────────────────────────

export function CancelDialog({ a, sheet, onClose }: { a: Appt; sheet: boolean; onClose: () => void }) {
  const [reason, setReason] = useState(0);
  const [notify, setNotify] = useState(true);
  function confirm() {
    const undo = cancelAppt(a, { reason, notify });
    toast(`Cita cancelada${notify ? " · aviso por WhatsApp en cola" : ""}`, undo);
    onClose();
  }
  return (
    <Modal onClose={onClose} width={420} label="Cancelar cita" sheet={sheet} z={120}>
      <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
        <b style={{ fontSize: 20 }}>Cancelar esta cita</b>
        <div style={{ fontSize: 14, color: "var(--ink-500)" }}>{a.p} · {a.s}</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Motivo</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CANCEL_REASONS.map((t, i) => (
            <button key={t} type="button" aria-pressed={reason === i} onClick={() => setReason(i)} style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", border: 0, background: reason === i ? "var(--brand-50)" : "var(--surface)", color: "var(--ink-900)", boxShadow: reason === i ? "inset 0 0 0 2px var(--brand-500)" : "inset 0 0 0 1px var(--line)" }}>{t}</button>
          ))}
        </div>
        <label style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 44, fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={notify} onChange={() => setNotify(!notify)} style={{ width: 20, height: 20 }} />
          Avisar al paciente por WhatsApp
        </label>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={btnOutline}>Volver</button>
          <button type="button" onClick={confirm} style={{ ...btnPrimary(), background: "var(--error-fg)" }}>Cancelar cita</button>
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────── Cobrar ─────────────────────────

export function PayDialog({ a, alerts, sheet, onClose }: { a: Appt; alerts: string[]; sheet: boolean; onClose: () => void }) {
  const brand = useBrand();
  const [amount, setAmount] = useState(String(priceFor(a)));
  const [method, setMethod] = useState<PayMethod>("Efectivo");
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const amt = parseFloat(amount.replace(",", "."));
  const ok = amt > 0;

  return (
    <Modal onClose={onClose} width={480} label={receipt ? "Cobro registrado" : "Cobrar cita"} sheet={sheet} z={120}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: 22 }}>{receipt ? "Cobro registrado" : "Cobrar cita"}</b>
          <CloseBtn onClick={onClose} />
        </div>
        {!receipt ? (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--brand-50)", fontWeight: 700, color: "var(--brand-800)", fontSize: 14 }}>
              {a.p} · {a.s}
              {alerts.length > 0 && <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--error-fg)" }}>⚠ {alerts.join(" · ")}</span>}
            </div>
            <label style={labelStyle}>Monto (S/)
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="tnum" style={{ ...fieldStyle, height: 50, fontSize: 20, fontWeight: 700, border: ok ? "1px solid var(--line)" : "2px solid var(--error-fg)" }} />
            </label>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Método de pago</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PAY_METHODS.map((m) => <button key={m} type="button" aria-pressed={m === method} onClick={() => setMethod(m)} style={chipStyle(m === method, { padding: "11px 14px" })}>{m}</button>)}
              </div>
            </div>
            <button type="button" disabled={!ok} onClick={() => ok && setReceipt(chargeAppt(a, amt, method))} style={{ ...btnPrimary(ok), minHeight: 50 }}>Registrar cobro</button>
          </>
        ) : (
          <>
            <div style={{ borderRadius: 14, boxShadow: "inset 0 0 0 1px var(--line)", padding: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><b>{brand.name}</b><span className="tnum" style={{ color: "var(--ink-500)" }}>{receipt.no}</span></div>
              <span style={{ color: "var(--ink-500)" }}>Comprobante de pago (demo) · {receipt.date}</span>
              <div style={{ borderTop: "1px dashed var(--line)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{receipt.concept} · {receipt.patient}</span><b className="tnum">{money(receipt.amount)}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-500)" }}><span>Pagado con {receipt.method}</span><span>Total <b className="tnum" style={{ color: "var(--ink-900)" }}>{money(receipt.amount)}</b></span></div>
            </div>
            <button type="button" onClick={onClose} style={{ ...btnPrimary(), minHeight: 50 }}>Listo</button>
          </>
        )}
      </div>
    </Modal>
  );
}

