"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import Icon, { type IconName } from "@/components/ui/Icon";
import { agendaStore, patchAppt } from "@/lib/agenda-store";
import { actMine, useMine } from "@/lib/backend/public-api";
import { isRemote } from "@/lib/backend/config";
import { type Appt, apptWhenLong, freeStarts, hm, isClosedDay } from "@/lib/agenda";
import { useBrand } from "@/lib/brand";
import { addDays, dayOfMonth, diffDays, limaMinutesNow, weekday, WEEKDAYS_SHORT } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { buildIcs, icsHref } from "@/lib/ics";
import { useDoctors } from "@/lib/doctors";
import { useMediaQuery } from "@/lib/media-query";

const STATUS_NAME: Record<Appt["st"], string> = {
  pendiente: "Pendiente de confirmar",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  reprogramada: "Reprogramada · por confirmar",
  atendida: "Atendida",
  "en-sala": "En sala",
  "no-show": "No asistió",
  bloqueo: "Horario bloqueado",
};

const btn: React.CSSProperties = { cursor: "pointer", border: 0, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700 };
const chip = (on: boolean, extra: React.CSSProperties = {}): React.CSSProperties => ({
  cursor: "pointer", border: 0, borderRadius: 12, background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)", ...extra,
});

export default function MiCita({ id }: { id: string }) {
  const brand = useBrand();
  const wide = useMediaQuery("(min-width: 900px)");
  const [{ appts: localAppts }] = agendaStore.useStore();
  const mine = useMine(id);
  const docs = useDoctors();
  const [ready, setReady] = useState(false);
  const appts = isRemote ? (mine.appt ? [...mine.busy, mine.appt] : mine.busy) : localAppts;
  const today = useToday();
  const [sheet, setSheet] = useState<null | "resched" | "cancel">(null);
  const [rs, setRs] = useState<{ date: string | null; slot: number | null; doc: number | null }>({ date: null, slot: null, doc: null });
  const [toast, setToast] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400); // breve esqueleto de carga
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const a = isRemote ? mine.appt ?? undefined : localAppts.find((x) => x.id === Number(id));
  const rsDate = rs.date ?? (a && today ? (a.date >= today ? a.date : today) : today);
  const rsDoc = rs.doc ?? a?.doc ?? docs[0]?.id ?? 0;
  const nowMin = limaMinutesNow();
  const chips = a && today && rsDate
    ? freeStarts(appts, rsDate, rsDoc, a.dur, { step: 2, ignoreId: a.id }).filter((s) => !(rsDate === today && 540 + s * 15 <= nowMin))
    : [];
  const days = today ? Array.from({ length: 12 }, (_, i) => addDays(today, i)).filter((d) => !isClosedDay(d)) : [];

  /** Aplica la acción en el servidor (modo remoto) o en el almacén local (demo). */
  async function act(action: Parameters<typeof actMine>[1], patch: Partial<Appt>, ok: string, closeSheet = false) {
    if (!a) return;
    if (isRemote) {
      const err = await actMine(id, action);
      if (err) return setToast(err);
    } else patchAppt(a.id, patch);
    if (closeSheet) setSheet(null);
    setToast(ok);
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ maxWidth: wide ? undefined : 460, margin: "0 auto", minHeight: "100vh", background: "var(--grad-hero)", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: wide ? "18px 72px" : "14px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "center" }}>
        <Link href="/" style={{ flex: 1, color: "inherit" }} aria-label="Ir al sitio"><BrandMark size="sm" /></Link>
        <ThemeToggle style={{ margin: "-6px -10px -6px 0" }} />
      </div>
      {children}
      {toast && <div role="status" aria-live="polite" style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 24, padding: "13px 18px", borderRadius: 12, background: "var(--brand-900)", color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "var(--shadow-lg)", whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );

  if (!ready || !today || (isRemote && mine.loading)) {
    return shell(
      <div className="da-skeleton" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ height: 130, borderRadius: 18, background: "var(--muted)" }} />
        <div style={{ height: 170, borderRadius: 16, background: "var(--muted)" }} />
        <div style={{ height: 52, borderRadius: 12, background: "var(--muted)" }} />
      </div>,
    );
  }

  if (!a) {
    return shell(
      <div style={{ padding: "40px 24px", textAlign: "center", display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--brand-50)", color: "var(--brand-text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="calendar-x" /></span>
        <b style={{ fontSize: 20 }}>No encontramos tu cita</b>
        <span style={{ color: "var(--ink-500)", fontSize: 14, lineHeight: 1.5 }}>El enlace puede estar incompleto o la cita fue eliminada. Escríbenos por WhatsApp y te ayudamos.</span>
        <a href={brand.waLink} style={{ marginTop: 6, minHeight: 48, padding: "0 20px", borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center" }}>Escribir por WhatsApp</a>
      </div>,
    );
  }

  const d = diffDays(a.date, today);
  const closed = a.st === "cancelada" || a.st === "atendida" || a.st === "no-show";
  const past = d < 0 && !closed;
  const count = a.st === "cancelada" ? "Cita cancelada" : a.st === "atendida" ? "Cita atendida" : past ? "Cita vencida" : d === 0 ? "Es hoy" : d === 1 ? "Falta 1 día" : `Faltan ${d} días`;
  const docName = docs.find((x) => x.id === a.doc)?.name ?? docs[0]?.name ?? "";
  const rows: [string, IconName][] = [[a.s, "smile"], [docName, "user"], [brand.address, "map-pin"], [`Paciente: ${a.p}`, "id-card"]];
  const canAct = !closed && !past;
  const canConfirm = a.st === "pendiente" || a.st === "reprogramada";
  const canRebook = a.st === "cancelada" || past;
  const rsOk = rs.slot !== null && chips.includes(rs.slot);
  const ics = icsHref(buildIcs({ date: a.date, slot: a.slot, dur: a.dur, summary: `${a.s} · ${brand.name}`, location: brand.address }));

  return shell(
    <>
      {wide ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: 880, maxWidth: "100%", background: "var(--surface)", borderRadius: 20, boxShadow: "var(--shadow-lg)", display: "grid", gridTemplateColumns: "1fr 1fr", overflow: "hidden" }}>
            <div style={{ background: "var(--brand-900)", color: "#fff", padding: 36, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
              <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 999, background: `var(--st-${a.st}-bg)`, color: `var(--st-${a.st}-fg)`, fontSize: 12, fontWeight: 700 }}>{STATUS_NAME[a.st]}</span>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.02em", marginTop: 10 }}>{count}</div>
              <div className="tnum" style={{ color: "var(--brand-200)", fontSize: 17 }}>{apptWhenLong(a)}</div>
            </div>
            <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 14 }}>
              <b style={{ fontSize: 20 }}>Tu cita</b>
              {past && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>Este enlace ya venció porque la fecha de la cita pasó. Puedes reservar una nueva.</div>}
              {rows.map(([t, i]) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15 }}><Icon name={i} style={{ color: "var(--brand-600)" }} />{t}</div>
              ))}
              {canAct && (
                <>
                  <div style={{ height: 6 }} />
                  {canConfirm && <button type="button" onClick={() => { void act({ kind: "confirm" }, { st: "confirmada" }, "¡Asistencia confirmada!"); }} style={{ ...btn, minHeight: 52, borderRadius: 12, background: "var(--grad-btn)", color: "#fff" }}>Confirmar asistencia</button>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button type="button" onClick={() => { setRs({ date: null, slot: null, doc: null }); setSheet("resched"); }} style={{ ...btn, minHeight: 48, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-text)", background: "var(--surface)" }}>Reprogramar</button>
                    <button type="button" onClick={() => setSheet("cancel")} style={{ ...btn, minHeight: 48, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", color: "var(--error-fg)", background: "var(--surface)" }}>Cancelar</button>
                  </div>
                  <a href={ics} download="cita-dentassist.ics" style={{ ...btn, minHeight: 44, color: "var(--brand-text)", textDecoration: "none", fontSize: 14 }}><Icon name="calendar-plus" />Agregar al calendario</a>
                </>
              )}
              {canRebook && <Link href="/reserva" style={{ minHeight: 52, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Reservar una nueva cita</Link>}
            </div>
          </div>
        </div>
      ) : (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        <div style={{ borderRadius: 18, padding: 20, boxShadow: "inset 0 0 0 1px var(--brand-100)", display: "flex", flexDirection: "column", gap: 6, background: "var(--grad-hero)" }}>
          <span style={{ alignSelf: "flex-start", padding: "4px 10px", borderRadius: 999, background: `var(--st-${a.st}-bg)`, color: `var(--st-${a.st}-fg)`, fontSize: 12, fontWeight: 700 }}>{STATUS_NAME[a.st]}</span>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 38, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-.02em", color: "var(--brand-text)" }}>{count}</div>
          <div className="tnum" style={{ color: "var(--ink-500)", fontSize: 15 }}>{apptWhenLong(a)}</div>
        </div>
        {past && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>Este enlace ya venció porque la fecha de la cita pasó. Puedes reservar una nueva.</div>}
        <div style={{ background: "var(--surface)", borderRadius: 16, padding: 18, boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map(([t, i]) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 15 }}><Icon name={i} style={{ color: "var(--brand-600)" }} /><span className="tnum">{t}</span></div>
          ))}
        </div>
        {canAct && (
          <>
            <div style={{ flex: 1 }} />
            {canConfirm && <button type="button" onClick={() => { void act({ kind: "confirm" }, { st: "confirmada" }, "¡Asistencia confirmada!"); }} style={{ ...btn, minHeight: 52, borderRadius: 12, background: "var(--grad-btn)", color: "#fff" }}>Confirmar asistencia</button>}
            <a href={ics} download="cita-dentassist.ics" style={{ ...btn, minHeight: 50, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-text)", textDecoration: "none" }}><Icon name="calendar-plus" />Agregar al calendario</a>
            <button type="button" onClick={() => { setRs({ date: null, slot: null, doc: null }); setSheet("resched"); }} style={{ ...btn, minHeight: 50, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-text)", background: "var(--surface)" }}>Reprogramar</button>
            <button type="button" onClick={() => setSheet("cancel")} style={{ ...btn, minHeight: 44, color: "var(--error-fg)", background: "transparent" }}>Cancelar cita</button>
          </>
        )}
        {canRebook && <Link href="/reserva" style={{ minHeight: 52, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Reservar una nueva cita</Link>}
      </div>
      )}

      {sheet && (
        <div onClick={() => setSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(16,36,27,.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
          <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 460, background: "var(--surface)", borderRadius: "22px 22px 0 0", padding: "22px 20px 24px", display: "flex", flexDirection: "column", gap: 12, maxHeight: "85vh", overflow: "auto" }}>
            {sheet === "resched" ? (
              <>
                <b style={{ fontSize: 20 }}>Elige un nuevo horario</b>
                <div style={{ padding: "10px 12px", borderRadius: 12, background: "var(--muted)", fontSize: 13, color: "var(--ink-700)" }}>Tu cita actual: <b className="tnum">{apptWhenLong(a)}</b></div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>Doctor</div>
                <div style={{ display: "flex", gap: 6, overflow: "auto" }}>
                  {docs.map((x) => (
                    <button key={x.id} type="button" onClick={() => setRs({ date: rsDate, slot: null, doc: x.id })} style={chip(x.id === rsDoc, { whiteSpace: "nowrap", minHeight: 44, padding: "0 14px", fontSize: 13, fontWeight: 700 })}>{x.name}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, overflow: "auto" }}>
                  {days.map((iso) => (
                    <button key={iso} type="button" onClick={() => setRs({ date: iso, slot: null, doc: rs.doc })} style={chip(iso === rsDate, { minWidth: 52, minHeight: 60, textAlign: "center", padding: "8px 0" })}>
                      <div style={{ fontSize: 12 }}>{WEEKDAYS_SHORT[weekday(iso)]}</div>
                      <div className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{dayOfMonth(iso)}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {chips.slice(0, 12).map((s) => (
                    <button key={s} type="button" className="tnum" onClick={() => setRs({ date: rsDate, slot: s, doc: rs.doc })} style={chip(s === rs.slot, { minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15 })}>{hm(s)}</button>
                  ))}
                </div>
                {chips.length === 0 && <div style={{ fontSize: 13, color: "var(--warning-fg)", background: "var(--warning-bg)", padding: "10px 12px", borderRadius: 10, fontWeight: 600 }}>No hay horarios libres ese día. Prueba otro.</div>}
                <button type="button" disabled={!rsOk} onClick={() => { if (!rsOk || rs.slot === null) return; void act({ kind: "reschedule", date: rsDate, slot: rs.slot, doc: rsDoc }, { date: rsDate, slot: rs.slot, doc: rsDoc, st: "reprogramada" }, `Cita reprogramada · ${docs.find((x) => x.id === rsDoc)?.name ?? ""}`, true); }} style={{ ...btn, minHeight: 50, borderRadius: 12, background: rsOk ? "var(--grad-btn)" : "var(--muted)", color: rsOk ? "#fff" : "var(--ink-300)", cursor: rsOk ? "pointer" : "not-allowed" }}>Confirmar nuevo horario</button>
              </>
            ) : (
              <>
                <b style={{ fontSize: 20 }}>¿Cancelar tu cita?</b>
                <span style={{ fontSize: 14, color: "var(--ink-500)", lineHeight: 1.5 }}>Liberaremos el horario. Puedes reservar otro cuando quieras.</span>
                <button type="button" onClick={() => { void act({ kind: "cancel" }, { st: "cancelada" }, "Cita cancelada", true); }} style={{ ...btn, minHeight: 50, borderRadius: 12, background: "var(--error-fg)", color: "#fff" }}>Sí, cancelar cita</button>
                <button type="button" onClick={() => setSheet(null)} style={{ ...btn, minHeight: 46, borderRadius: 12, boxShadow: "inset 0 0 0 1px var(--line)", background: "transparent", color: "inherit" }}>Volver</button>
              </>
            )}
          </div>
        </div>
      )}
    </>,
  );
}
