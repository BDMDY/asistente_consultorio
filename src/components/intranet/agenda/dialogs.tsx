"use client";
import { useState } from "react";
import { CloseBtn, Modal, Notice, Segmented, btnOutline, btnPrimary, chipStyle, fieldStyle, labelStyle } from "@/components/ui/kit";
import { type Appt, type SeriesRule, checkReschedule, clash, freeStarts, generateSeries, hm, hoursError, isClosedDay, slotOf } from "@/lib/agenda";
import { type BlockForm, CANCEL_REASONS, type NewApptForm, createBlocks, validateBlock, cancelAppt, chargeSession, createAppts, priceFor, rescheduleAppt, validateNew } from "@/lib/agenda-actions";
import { agendaStore } from "@/lib/agenda-store";
import { labelShort, weekday, WEEKDAYS_SHORT } from "@/lib/dates";
import { type Doctor, activeServices, parsePrice, serviceSessions, serviceSlots, sessionValue, useMedia } from "@/lib/media";
import { type PlanItem, addItems, planItems, plansStore, sessionPrice } from "@/lib/clinical";
import { todayISO } from "@/lib/dates";
import { uid } from "@/lib/mod";
import { PAY_METHODS, type PayMethod, type Payment, money } from "@/lib/payments";
import { delayMessage, rescheduleMessage } from "@/lib/attention";
import { enqueue } from "@/lib/outbox";
import { patientOf, patientsStore, samePatientName } from "@/lib/patients";
import NewPatientDialog from "../pacientes/NewPatientDialog";
import { toast } from "@/lib/toast";
import { getSchedule, useBrand } from "@/lib/brand";
import { closedReason } from "@/lib/schedule";

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
  const services = activeServices(media).length ? activeServices(media) : [{ id: 0, name: "Consulta", desc: "", price: "" }];

  const [mode, setMode] = useState(initial.mode);
  const [f, setF] = useState<NewApptForm & { picked: boolean }>({
    patient: initial.patient, picked: !!initial.patient, isNew: false, svc: services[0].name, doc: initial.doc,
    date: initial.date, time: initial.time, dur: serviceSlots(services[0], 0), notes: "",
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
  const exact = patients.some((p) => p.name.toLowerCase() === q || p.dni === q);
  const [regOpen, setRegOpen] = useState(false);
  const asDni = /^\d+$/.test(q);
  const free = freeStarts(appts, f.date, f.doc, f.dur).slice(0, 12);
  const hit = slot !== null ? clash(appts, { date: f.date, doc: f.doc, slot, dur: f.dur }) : null;
  const plan = series && slot !== null ? generateSeries(appts, { date: f.date, slot, doc: f.doc, dur: f.dur }, rule) : [];
  const okN = plan.filter((x) => x.status !== "skip").length;
  const docName = docs.find((d) => d.id === f.doc)?.name ?? "";

  let avail: { tone: "success" | "warning" | "error"; icon: "circle-check" | "triangle-alert" | "circle-x" | "clock"; msg: string };
  if (isClosedDay(f.date)) avail = { tone: "warning", icon: "triangle-alert", msg: closedReason(f.date, getSchedule()) + "." };
  else if (slot === null) avail = { tone: "warning", icon: "clock", msg: "Elige una hora en tramos de 15 min." };
  else if (hoursError(f.date, slot, f.dur)) avail = { tone: "warning", icon: "clock", msg: hoursError(f.date, slot, f.dur) + "." };
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
              <button type="button" onClick={() => setRegOpen(true)} style={{ cursor: "pointer", display: "block", width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 14, fontWeight: 700, color: "var(--brand-text)", border: 0, borderTop: "1px solid var(--line)", background: "transparent", fontFamily: "inherit" }}>
                {asDni && matches.length === 0 ? `No hay un paciente con DNI ${q} · ` : ""}+ Registrar paciente nuevo
              </button>
                        )}
          </div>
        )}
        {f.isNew && <span style={{ display: "inline-block", marginTop: 6, padding: "3px 9px", borderRadius: 999, background: "var(--info-bg)", color: "var(--info-fg)", fontSize: 12, fontWeight: 700 }}>Paciente nuevo · se creará su ficha</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={labelStyle}>Servicio
          <select value={f.svc} onChange={(e) => { const i = services.findIndex((s) => s.name === e.target.value); patch({ svc: e.target.value, dur: serviceSlots(services[Math.max(0, i)], Math.max(0, i)) }); }} style={fieldStyle}>
            {services.map((s, i) => <option key={s.id} value={s.name}>{s.name} · {serviceSlots(s, i) * 15} min</option>)}
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
          <input type="time" step={900} value={f.time} onChange={(e) => patch({ time: e.target.value })} style={fieldStyle} />
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
      {regOpen && (
        <NewPatientDialog
          sheet={sheet}
          z={130}
          initial={asDni ? { dni: q.slice(0, 8) } : { name: f.patient.trim() }}
          toastText="Paciente registrado · ya puedes agendar su cita"
          onClose={() => setRegOpen(false)}
          onCreated={(np) => patch({ patient: np.name, picked: true, isNew: false })}
        />
      )}
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
          <label style={labelStyle}>Nueva hora<input type="time" step={900} value={r.time} onChange={(e) => setR({ ...r, time: e.target.value })} style={fieldStyle} /></label>
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

interface PayLine { key: string; concept: string; amount: string; on: boolean; planItem?: string }

/** Cobro de la sesión: uno o varios tratamientos, cada uno con su monto y, si es del plan del paciente, su avance. */
export function PayDialog({ a, alerts, sheet, onClose }: { a: Appt; alerts: string[]; sheet: boolean; onClose: () => void }) {
  const brand = useBrand();
  const media = useMedia();
  const [patients] = patientsStore.useStore();
  const [plans] = plansStore.useStore();
  const patient = patientOf(patients, a);
  const plan = patient ? plans[patient.id] : undefined;
  const pending = planItems(plan).filter((it) => it.done < it.total);
  const same = (x: string, y: string) => x.toLowerCase().includes(y.toLowerCase()) || y.toLowerCase().includes(x.toLowerCase());

  const [lines, setLines] = useState<PayLine[]>(() => {
    const out: PayLine[] = pending.map((it) => ({ key: "p:" + it.id, concept: it.name, amount: String(sessionPrice(it)), on: same(a.s, it.name), planItem: it.id }));
    if (!out.some((l) => l.on)) out.unshift({ key: "svc", concept: a.s, amount: String(priceFor(a)), on: true });
    return out;
  });
  const [method, setMethod] = useState<PayMethod>("Efectivo");
  const [receipt, setReceipt] = useState<{ pays: Payment[]; progress: string[] } | null>(null);
  const on = lines.filter((l) => l.on);
  const num = (l: PayLine) => parseFloat(l.amount.replace(",", "."));
  const total = on.reduce((n, l) => n + (num(l) > 0 ? num(l) : 0), 0);
  const ok = on.length > 0 && on.every((l) => num(l) > 0);
  const patch = (key: string, p: Partial<PayLine>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const extra = activeServices(media).filter((sv) => !lines.some((l) => l.concept === sv.name));
  // Tratamiento nuevo indicado durante la sesión (por ejemplo, tras la evaluación): entra al plan del paciente y a este cobro.
  const [adding, setAdding] = useState(false);
  const [nt, setNt] = useState({ name: "", n: "1", price: "", auto: false, custom: false });
  const svOf = (name: string) => activeServices(media).find((x) => x.name === name);
  
  function pickNew(name: string) {
    if (name === "__otro") return setNt((x) => ({ ...x, name: "", custom: true, auto: false }));
    const sv = svOf(name);
    // El precio del servicio es el total del tratamiento y trae su número de sesiones; cada sesión vale precio ÷ sesiones.
    setNt((x) => (sv && parsePrice(sv.price) > 0 ? { ...x, name, custom: false, price: String(parsePrice(sv.price)), n: String(serviceSessions(sv)), auto: true } : { ...x, name, custom: false, auto: false }));
  }
  const setSessions = (n: string) => setNt((x) => ({ ...x, n }));
  function addNew() {
    if (!patient) return toast("Registra primero al paciente en Pacientes para crear su plan");
    const n = Math.max(1, parseInt(nt.n, 10) || 1), price = parseFloat(nt.price);
    if (nt.name.trim().length < 3 || !(price > 0)) return toast("Indica el tratamiento, sus sesiones y su precio total");
    const it: PlanItem = { id: uid(), name: nt.name.trim(), total: n, done: 0, price, paid: 0, at: todayISO() };
    plansStore.update((all) => ({ ...all, [patient.id]: addItems(all[patient.id], [it]) }));
    setLines((ls) => [...ls, { key: "p:" + it.id, concept: it.name, amount: String(sessionPrice(it)), on: true, planItem: it.id }]);
    setAdding(false);
    setNt({ name: "", n: "1", price: "", auto: false, custom: false });
    toast(`${it.name} agregado al plan del paciente`);
  }

  function charge() {
    if (!ok) return;
    const progress = on.filter((l) => l.planItem).map((l) => { const it = pending.find((x) => x.id === l.planItem)!; return `${it.name}: ${it.done + 1} de ${it.total} sesiones`; });
    const pays = chargeSession(a, on.map((l) => ({ concept: l.concept, amount: num(l), planItem: l.planItem })), method, patient?.id);
    setReceipt({ pays, progress });
  }

  return (
    <Modal onClose={onClose} width={520} label={receipt ? "Cobro registrado" : "Cobrar sesión"} sheet={sheet} z={120}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ fontSize: 22 }}>{receipt ? "Cobro registrado" : "Cobrar sesión"}</b>
          <CloseBtn onClick={onClose} />
        </div>
        {!receipt ? (
          <>
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--brand-50)", fontWeight: 700, color: "var(--brand-800)", fontSize: 14 }}>
              {a.p} · {a.s}
              {alerts.length > 0 && <span style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--error-fg)" }}>⚠ {alerts.join(" · ")}</span>}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.5 }}>Marca los tratamientos que se hicieron en esta sesión. Cada uno se cobra por separado en un mismo comprobante y, si es parte del plan del paciente, suma un control a su avance.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }} role="group" aria-label="Tratamientos de la sesión">
              {lines.map((l) => {
                const it = l.planItem ? pending.find((x) => x.id === l.planItem) : undefined;
                return (
                  <div key={l.key} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 12, boxShadow: `inset 0 0 0 ${l.on ? 2 : 1}px ${l.on ? "var(--brand-500)" : "var(--line)"}`, background: l.on ? "var(--brand-50)" : "transparent" }}>
                    <input type="checkbox" aria-label={`Incluir ${l.concept}`} checked={l.on} onChange={(e) => patch(l.key, { on: e.target.checked })} style={{ width: 20, height: 20, accentColor: "var(--brand-600)" }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                      <b>{l.concept}</b>
                      <span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>{it ? `Plan: ${it.done} de ${it.total} sesiones${l.on ? ` → ${it.done + 1}` : ""}` : "Fuera del plan (solo cobro)"}</span>
                    </span>
                    <input aria-label={`Monto de ${l.concept}`} value={l.amount} disabled={!l.on} onChange={(e) => patch(l.key, { amount: e.target.value })} inputMode="decimal" className="tnum" style={{ ...fieldStyle, width: 96, height: 42, fontSize: 15, fontWeight: 700, textAlign: "right", border: l.on && !(num(l) > 0) ? "2px solid var(--error-fg)" : "1px solid var(--line)" }} />
                  </div>
                );
              })}
              {adding ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)" }}>
                  <b style={{ fontSize: 14 }}>Nuevo tratamiento del plan</b>
                  <select aria-label="Nuevo tratamiento" value={nt.custom ? "__otro" : nt.name} onChange={(e) => pickNew(e.target.value)} style={{ ...fieldStyle, height: 44, fontSize: 14 }}>
                    <option value="" disabled>Elige un servicio…</option>
                    {activeServices(media).map((x) => <option key={x.id} value={x.name}>{x.name} · {money(parsePrice(x.price) || 0)} · {serviceSessions(x)} {serviceSessions(x) === 1 ? "sesión" : "sesiones"}</option>)}
                    <option value="__otro">Otro tratamiento (escribir)</option>
                  </select>
                  {nt.custom && <input aria-label="Nombre del tratamiento" value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} placeholder="Nombre del tratamiento" style={{ ...fieldStyle, height: 44, fontSize: 14 }} />}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input aria-label="Sesiones previstas" value={nt.n} inputMode="numeric" onChange={(e) => setSessions(e.target.value)} placeholder="Sesiones" style={{ ...fieldStyle, height: 44, fontSize: 14 }} />
                    <input aria-label="Precio total del tratamiento" value={nt.price} inputMode="decimal" onChange={(e) => setNt({ ...nt, price: e.target.value, auto: false })} placeholder="Precio total (S/)" style={{ ...fieldStyle, height: 44, fontSize: 14 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setAdding(false)} style={btnOutline}>Cancelar</button>
                    <button type="button" onClick={addNew} style={btnPrimary()}>Agregar al plan y a esta sesión</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} style={{ ...btnOutline, alignSelf: "flex-start" }}>+ Nuevo tratamiento (indicado en esta sesión)</button>
              )}
              {extra.length > 0 && (
                <select aria-label="Agregar otro tratamiento" value="" onChange={(e) => { const sv = extra.find((x) => x.name === e.target.value); if (sv) setLines((ls) => [...ls, { key: "s:" + sv.name, concept: sv.name, amount: String(sessionValue(sv) || 0), on: true }]); }} style={{ ...fieldStyle, height: 44, fontSize: 14 }}>
                  <option value="">+ Cobrar otro servicio (sin plan)…</option>
                  {extra.map((sv) => <option key={sv.id} value={sv.name}>{sv.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 14 }}><span>Total a cobrar ({on.length} {on.length === 1 ? "tratamiento" : "tratamientos"})</span><b className="tnum" style={{ fontSize: 22 }}>{money(total)}</b></div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Método de pago</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {PAY_METHODS.map((m) => <button key={m} type="button" aria-pressed={m === method} onClick={() => setMethod(m)} style={chipStyle(m === method, { padding: "11px 14px" })}>{m}</button>)}
              </div>
            </div>
            <button type="button" disabled={!ok} onClick={charge} style={{ ...btnPrimary(ok), minHeight: 50 }}>Registrar cobro</button>
          </>
        ) : (
          <>
            <div style={{ borderRadius: 14, boxShadow: "inset 0 0 0 1px var(--line)", padding: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><b>{brand.name}</b><span className="tnum" style={{ color: "var(--ink-500)" }}>{receipt.pays[0].no}</span></div>
              <span style={{ color: "var(--ink-500)" }}>Comprobante de pago (demo) · {receipt.pays[0].date} · {receipt.pays[0].patient}</span>
              <div style={{ borderTop: "1px dashed var(--line)", margin: "8px 0" }} />
              {receipt.pays.map((p) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><span>{p.concept}</span><b className="tnum">{money(p.amount)}</b></div>)}
              <div style={{ borderTop: "1px dashed var(--line)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-500)" }}><span>Pagado con {receipt.pays[0].method}</span><span>Total <b className="tnum" style={{ color: "var(--ink-900)" }}>{money(receipt.pays.reduce((n, p) => n + p.amount, 0))}</b></span></div>
            </div>
            {receipt.progress.length > 0 && (
              <div role="status" style={{ padding: "10px 12px", borderRadius: 12, background: "var(--success-bg)", color: "var(--success-fg)", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                Avance registrado en el plan:{receipt.progress.map((t) => <span key={t} style={{ display: "block" }}>· {t}</span>)}
              </div>
            )}
            <button type="button" onClick={onClose} style={{ ...btnPrimary(), minHeight: 50 }}>Listo</button>
          </>
        )}
      </div>
    </Modal>
  );
}


// ───────────────────────── Avisar al siguiente paciente ─────────────────────────

/** Mensaje de demora o de reprogramación para el próximo paciente; se abre en WhatsApp ya escrito y queda registrado en la cola de salida. */
export function ContactDialog({ next, delayMin, mode: initialMode, sheet, onClose, onResched }: {
  next: Appt;
  delayMin: number;
  mode: "demora" | "reprogramar";
  sheet: boolean;
  onClose: () => void;
  onResched: () => void;
}) {
  const brand = useBrand();
  const [patients] = patientsStore.useStore();
  const [mode, setMode] = useState(initialMode);
  const [minutes, setMinutes] = useState(delayMin);
  const when = hm(next.slot);
  const known = patients.find((p) => (next.dni && p.dni === next.dni) || samePatientName(next.p, p.name));
  const fullName = known?.name ?? next.p;
  const phone = (next.phone || known?.phone || "").replace(/\D/g, "");
  const link = typeof window !== "undefined" ? `${window.location.origin}/mi-cita/${next.token ?? next.id}` : undefined;
  const auto = mode === "demora"
    ? delayMessage({ name: fullName, clinic: brand.name, minutes, when, link })
    : rescheduleMessage({ name: fullName, clinic: brand.name, when, link });
  const [custom, setCustom] = useState<string | null>(null);
  const text = custom ?? auto;
  const pick = (m: typeof mode) => { setMode(m); setCustom(null); };

  function send() {
    const intl = phone.length === 9 ? "51" + phone : phone;
    if (intl) window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    enqueue({ kind: "demora", channel: "whatsapp", patient: next.p, apptId: next.id, text });
    toast(intl ? `Aviso listo en WhatsApp para ${next.p}` : `Aviso registrado para ${next.p} (sin teléfono: envíalo manualmente)`);
    onClose();
    if (mode === "reprogramar") onResched();
  }

  return (
    <Modal onClose={onClose} width={560} label="Avisar al paciente" sheet={sheet}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 22 }}>Avisar a {next.p}</b><CloseBtn onClick={onClose} /></div>
        <div className="tnum" style={{ fontSize: 14, color: "var(--ink-500)" }}>Cita de las {when} · {next.s}{phone ? ` · ${phone}` : " · sin teléfono registrado"}</div>
        <Segmented value={mode} onChange={pick} options={[["demora", "Avisar demora"], ["reprogramar", "Ofrecer reprogramar"]]} />
        {mode === "demora" && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }} role="group" aria-label="Demora estimada">
            <span style={{ fontSize: 14, fontWeight: 600 }}>Demora estimada</span>
            {[10, 15, 20, 30, 45].map((m) => <button key={m} type="button" aria-pressed={m === minutes} onClick={() => { setMinutes(m); setCustom(null); }} style={timeChip(m === minutes)}>{m} min</button>)}
          </div>
        )}
        <label style={labelStyle}>Mensaje (puedes editarlo)
          <textarea value={text} onChange={(e) => setCustom(e.target.value)} rows={6} style={{ ...fieldStyle, height: "auto", padding: 12, fontSize: 14, lineHeight: 1.5, resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
          <button type="button" onClick={send} style={btnPrimary()}>{phone ? "Abrir WhatsApp y registrar" : "Registrar aviso"}</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-500)" }}>El envío automático se activará al conectar la API de WhatsApp; mientras tanto se abre el chat con el mensaje listo.</div>
      </div>
    </Modal>
  );
}

// ───────────────────────── Bloquear horario ─────────────────────────

const BLOCK_LABELS = ["Almuerzo", "Reunión", "Capacitación", "Otro"] as const;

/** Reserva un rango de la agenda (almuerzo, reunión…) para uno o todos los doctores, una vez o todos los días de atención. */
export function BlockDialog({ today, date, docs, initial, sheet, onClose, onCreated }: {
  today: string; date: string; docs: Doctor[]; initial?: { doc?: number; time?: string }; sheet: boolean; onClose: () => void; onCreated: (date: string) => void;
}) {
  const [kind, setKind] = useState<(typeof BLOCK_LABELS)[number]>("Almuerzo");
  const [other, setOther] = useState("");
  const [f, setF] = useState({ doc: initial?.doc ?? 0, date: date < today ? today : date, from: initial?.time ?? "13:00", to: "14:00", repeat: "once" as "once" | "daily", until: "" });
  const form: BlockForm = { docs: f.doc ? [f.doc] : docs.map((d) => d.id), date: f.date, from: f.from, to: f.to, label: kind === "Otro" ? other : kind, repeat: f.repeat, until: f.until || f.date };
  const err = validateBlock(form, today);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  function create() {
    if (err) return;
    const r = createBlocks(form);
    if (!r.created.length) return toast("No se creó: en ese horario ya hay citas o bloqueos");
    toast(`Bloqueo «${form.label.trim()}» creado · ${f.from}–${f.to}${r.days > 1 ? ` · ${r.days} días` : ""}${r.skipped ? ` · ${r.skipped} omitido(s) por citas existentes` : ""}`, r.undo);
    onCreated(f.date);
    onClose();
  }

  return (
    <Modal onClose={onClose} width={520} label="Bloquear horario" sheet={sheet}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 22 }}>Bloquear horario</b><CloseBtn onClick={onClose} /></div>
        <div style={{ fontSize: 13, color: "var(--ink-500)", lineHeight: 1.5 }}>Nadie podrá agendar en ese rango, ni en la agenda ni en la reserva web.</div>
        <div role="group" aria-label="Motivo" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BLOCK_LABELS.map((l) => <button key={l} type="button" aria-pressed={kind === l} onClick={() => setKind(l)} style={timeChip(kind === l)}>{l}</button>)}
        </div>
        {kind === "Otro" && <label style={labelStyle}>Motivo<input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Ej. Mantenimiento del equipo" style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>}
        <label style={labelStyle}>Doctor
          <select value={f.doc} onChange={(e) => set({ doc: +e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }}>
            <option value={0}>Todos los doctores</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 10 }}>
          <label style={labelStyle}>Fecha<input type="date" min={today} value={f.date} onChange={(e) => set({ date: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>
          <label style={labelStyle}>Desde<input type="time" step={900} value={f.from} onChange={(e) => set({ from: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>
          <label style={labelStyle}>Hasta<input type="time" step={900} value={f.to} onChange={(e) => set({ to: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>
        </div>
        <Segmented value={f.repeat} onChange={(repeat) => set({ repeat })} options={[["once", "Solo este día"], ["daily", "Todos los días de atención"]]} />
        {f.repeat === "daily" && <label style={labelStyle}>Repetir hasta<input type="date" min={f.date} value={f.until} onChange={(e) => set({ until: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span role="alert" style={{ flex: 1, minWidth: 160, fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{err}</span>
          <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
          <button type="button" onClick={create} disabled={!!err} style={btnPrimary(!err)}>Bloquear</button>
        </div>
      </div>
    </Modal>
  );
}
