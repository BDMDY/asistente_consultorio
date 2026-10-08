"use client";
import Link from "next/link";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import Icon, { type IconName } from "@/components/ui/Icon";
import { hm, isClosedDay, isSlotTaken } from "@/lib/agenda";
import { isEmail } from "@/lib/session";
import { bookPublic, useBusy } from "@/lib/backend/public-api";
import { useBrand } from "@/lib/brand";
import { addDays, dayOfMonth, labelLong, limaMinutesNow, weekday, WEEKDAYS_SHORT } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { activeServices, doctorsOf, initials, serviceSlots, useMedia } from "@/lib/media";
import { defineStore } from "@/lib/store";

const ICONS: IconName[] = ["smile", "sparkles", "sun", "shield-check", "stethoscope"];
const TITLES = ["Elige un servicio", "¿Con qué doctor?", "Elige día y hora", "Tus datos"];
const LABELS = ["PASO 1 DE 5", "PASO 2 DE 5 · OPCIONAL", "PASO 3 DE 5", "PASO 4 DE 5"];

type DocChoice = "any" | number | null;
interface Form { name: string; dni: string; phone: string; email?: string }
interface Draft { step: number; svcId: number | null; doc: DocChoice; date: string | null; slot: number | null; consent: boolean; f: Form }
const EMPTY: Draft = { step: 0, svcId: null, doc: null, date: null, slot: null, consent: false, f: { name: "", dni: "", phone: "", email: "" } };
/** Borrador de la reserva: persiste en la sesión del navegador (se pierde al cerrar la pestaña). */
const draftStore = defineStore<Draft>("da-draft-v1", () => EMPTY, { session: true });

const choiceStyle = (on: boolean): React.CSSProperties => ({
  cursor: "pointer", display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", border: 0, color: "inherit",
  background: on ? "var(--brand-50)" : "var(--surface)", borderRadius: 14, padding: "12px 14px", minHeight: 56,
  boxShadow: on ? "inset 0 0 0 2px var(--brand-500)" : "var(--shadow-md)", fontSize: 15,
});
const chipStyle = (on: boolean): React.CSSProperties => ({
  cursor: "pointer", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, fontWeight: 600, border: 0,
  background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)",
});

export default function Reserva() {
  const brand = useBrand();
  const media = useMedia();
  const appts = useBusy();
  const docs = doctorsOf(media);
  const services = activeServices(media);
  const doctorIds = docs.map((d) => d.id);

  const [d] = draftStore.useStore();
  const [tried, setTried] = useState(false);
  const [race, setRace] = useState(false);
  const [booked, setBooked] = useState<{ ref: string; doc: number; existing: boolean; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [bookErr, setBookErr] = useState("");
  const today = useToday();

  const patch = (p: Partial<Draft>) => draftStore.update((x) => ({ ...x, ...p }));
  const svc = services.find((s) => s.id === d.svcId) ?? null;
  const dur = svc ? serviceSlots(svc, media.services.indexOf(svc)) : 0;

  const days = today ? Array.from({ length: 6 }, (_, i) => addDays(today, i)) : [];
  const slots = (() => {
    if (!today || !d.date || !svc || d.doc === null || isClosedDay(d.date)) return [];
    const nowMin = limaMinutesNow();
    return Array.from({ length: 16 }, (_, i) => i * 2).filter((sl) => {
      if (d.date === today && 540 + sl * 15 <= nowMin) return false;
      return !isSlotTaken(appts, doctorIds, d.date!, d.doc === "any" ? null : d.doc, sl, dur);
    });
  })();

  const valid = {
    name: d.f.name.trim().length > 4,
    dni: /^\d{8}$/.test(d.f.dni),
    phone: d.f.phone.replace(/\D/g, "").length >= 9,
    email: !(d.f.email ?? "").trim() || isEmail((d.f.email ?? "").trim()),
  };
  const can = [d.svcId !== null, d.doc !== null, d.slot !== null, true, false][d.step];
  const formOk = valid.name && valid.dni && valid.phone && valid.email && d.consent;

  async function book() {
    if (!d.date || d.slot === null || !svc || d.doc === null || sending) return;
    setSending(true);
    setBookErr("");
    // El servidor valida de nuevo: otra persona pudo reservar mientras se llenaba el formulario.
    const res = await bookPublic({ doc: d.doc === "any" ? null : d.doc, date: d.date, slot: d.slot, dur, service: svc.name, name: d.f.name.trim(), dni: d.f.dni, phone: d.f.phone, email: (d.f.email ?? "").trim() || undefined }, doctorIds);
    setSending(false);
    if (!res.ok) {
      if (res.taken) {
        setRace(true);
        patch({ step: 2, slot: null });
      } else setBookErr(res.error);
      return;
    }
    setBooked({ ref: res.ref, doc: res.doc, existing: res.existing, name: res.name });
    patch({ step: 4 });
  }

  function next() {
    if (d.step === 3) {
      if (!formOk) return setTried(true);
      return void book();
    }
    if (!can) return;
    setRace(false);
    patch({ step: d.step + 1 });
  }

  function reset() {
    draftStore.set(EMPTY);
    setTried(false);
    setRace(false);
    setBooked(null);
    setBookErr("");
  }

  const bd = (ok: boolean) => (tried && !ok ? "2px solid var(--error-fg)" : "1px solid var(--line)");
  const input = (border: string): React.CSSProperties => ({ height: 50, borderRadius: 12, border, padding: "0 14px", fontSize: 16, background: "var(--surface)", color: "inherit" });
  const bookedDoc = booked ? docs.find((x) => x.id === booked.doc) : undefined;
  const summary: [string, IconName][] = svc && d.date && d.slot !== null && booked
    ? [[svc.name, "smile"], [bookedDoc?.name ?? "", "user"], [`${labelLong(d.date)} · ${hm(d.slot)}`, "calendar"], [brand.address, "map-pin"]]
    : [];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", minHeight: "100vh", background: "var(--bone)", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: "14px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
        {d.step > 0 && d.step < 4 && (
          <button type="button" aria-label="Volver" onClick={() => { setRace(false); patch({ step: d.step - 1 }); }} style={{ cursor: "pointer", width: 44, height: 44, margin: "-6px 0 -6px -10px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, color: "inherit" }}>
            <Icon name="arrow-left" />
          </button>
        )}
        <Link href="/" aria-label="Volver al sitio" style={{ flex: 1, color: "inherit" }}><BrandMark size="sm" /></Link>
        <ThemeToggle style={{ margin: "-6px -10px -6px 0" }} />
      </div>

      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        {d.step < 4 && (
          <>
            <div style={{ display: "flex", gap: 6 }} role="progressbar" aria-valuemin={1} aria-valuemax={5} aria-valuenow={d.step + 1}>
              {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= d.step ? "var(--brand-500)" : "var(--line)" }} />)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-500)" }}>{LABELS[d.step]}</div>
            <b style={{ fontFamily: "var(--font-display)", fontSize: 24 }}>{TITLES[d.step]}</b>
          </>
        )}

        {d.step === 0 && (
          <>
            {services.map((o) => (
              <button key={o.id} type="button" style={choiceStyle(d.svcId === o.id)} onClick={() => patch({ svcId: o.id, slot: null })}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--brand-50)", color: "var(--brand-text)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={ICONS[media.services.indexOf(o) % 5]} /></span>
                <span style={{ flex: 1 }}>
                  <b>{o.name}</b>
                  <span className="tnum" style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>{o.price ? `Desde S/ ${o.price} · ` : ""}{serviceSlots(o, media.services.indexOf(o)) * 15} min</span>
                </span>
              </button>
            ))}
            {services.length === 0 && (
              <div style={{ padding: 16, borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)", fontWeight: 600, fontSize: 14 }}>Por ahora no hay servicios disponibles para reservar en línea. Escríbenos por WhatsApp.</div>
            )}
          </>
        )}

        {d.step === 1 && (
          <>
            {[{ id: "any" as const, t: "Sin preferencia", s: "Te asignamos al primer doctor libre", i: "—" }, ...docs.map((x) => ({ id: x.id, t: x.name, s: `${x.spec || ""}${x.cop ? ` · COP ${x.cop}` : ""}`, i: initials(x.name) }))].map((o) => (
              <button key={o.id} type="button" style={choiceStyle(d.doc === o.id)} onClick={() => patch({ doc: o.id, slot: null })}>
                <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--brand-100)", color: "var(--brand-800)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{o.i}</span>
                <span style={{ flex: 1 }}><b>{o.t}</b><span style={{ display: "block", fontSize: 12, color: "var(--ink-500)" }}>{o.s}</span></span>
              </button>
            ))}
          </>
        )}

        {d.step === 2 && (
          <>
            {race && <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: "var(--error-bg)", color: "var(--error-fg)", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>Ese horario acaba de ser reservado por otra persona. Elige otro, por favor.</div>}
            <div style={{ display: "flex", gap: 6, overflow: "auto" }}>
              {days.map((iso) => {
                const closed = isClosedDay(iso), on = d.date === iso;
                return (
                  <button key={iso} type="button" disabled={closed} onClick={() => { setRace(false); patch({ date: iso, slot: null }); }} aria-label={labelLong(iso)}
                    style={{ cursor: closed ? "not-allowed" : "pointer", flex: 1, minWidth: 48, minHeight: 62, borderRadius: 12, textAlign: "center", padding: "8px 0", border: 0, background: on ? "var(--grad-btn)" : "var(--surface)", color: on ? "#fff" : "var(--ink-900)", boxShadow: on ? "none" : "inset 0 0 0 1px var(--line)", opacity: closed ? 0.4 : 1 }}>
                    <div style={{ fontSize: 12 }}>{WEEKDAYS_SHORT[weekday(iso)]}</div>
                    <div className="tnum" style={{ fontSize: 18, fontWeight: 700 }}>{dayOfMonth(iso)}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-500)" }}>Solo horarios libres · hora de Lima</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {slots.map((sl) => (
                <button key={sl} type="button" className="tnum" style={chipStyle(d.slot === sl)} onClick={() => patch({ slot: sl })}>{hm(sl)}</button>
              ))}
            </div>
            {d.date === null && <div style={{ fontSize: 13, color: "var(--ink-500)" }}>Elige un día para ver los horarios.</div>}
            {d.date !== null && slots.length === 0 && <div style={{ padding: 14, borderRadius: 12, background: "var(--warning-bg)", color: "var(--warning-fg)", fontWeight: 600, fontSize: 14 }}>Ese día no hay atención o no quedan horarios. Elige otro.</div>}
          </>
        )}

        {d.step === 3 && (
          <>
            <label style={{ fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5 }}>Nombre completo
              <input value={d.f.name} onChange={(e) => patch({ f: { ...d.f, name: e.target.value } })} placeholder="Como figura en tu DNI" autoComplete="name" style={input(bd(valid.name))} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5 }}>DNI
              <input value={d.f.dni} onChange={(e) => patch({ f: { ...d.f, dni: e.target.value.replace(/\D/g, "").slice(0, 8) } })} inputMode="numeric" placeholder="8 dígitos" style={input(bd(valid.dni))} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 700, display: "flex", flexDirection: "column", gap: 5 }}>Celular (WhatsApp)
              <input value={d.f.phone} onChange={(e) => patch({ f: { ...d.f, phone: e.target.value } })} inputMode="tel" placeholder="987 654 321" autoComplete="tel" style={input(bd(valid.phone))} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Correo electrónico <span style={{ fontWeight: 500, color: "var(--ink-500)" }}>(opcional)</span>
              <input value={d.f.email ?? ""} onChange={(e) => patch({ f: { ...d.f, email: e.target.value } })} type="email" inputMode="email" placeholder="nombre@correo.com" autoComplete="email" style={input(bd(valid.email))} />
            </label>
            <label style={{ cursor: "pointer", display: "flex", gap: 10, fontSize: 13, color: "var(--ink-500)", alignItems: "flex-start", lineHeight: 1.5 }}>
              <input type="checkbox" checked={d.consent} onChange={() => patch({ consent: !d.consent })} style={{ position: "absolute", opacity: 0, width: 22, height: 22 }} />
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 6, background: d.consent ? "var(--brand-600)" : "transparent", boxShadow: `inset 0 0 0 1.5px ${tried && !d.consent ? "var(--error-fg)" : d.consent ? "var(--brand-600)" : "var(--ink-300)"}`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="check" size={14} style={{ opacity: d.consent ? 1 : 0 }} />
              </span>
              Acepto el tratamiento de mis datos personales según la Ley 29733.
            </label>
            <Link href="/privacidad" target="_blank" style={{ fontSize: 13, fontWeight: 600 }}>Leer el aviso de privacidad</Link>
            {tried && !formOk && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>Completa los campos marcados para continuar.</div>}
          </>
        )}

        {d.step === 4 && booked && (
          <>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingTop: 16 }}>
              <span style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--grad-accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={40} /></span>
              <b style={{ fontSize: 26 }}>¡Cita reservada!</b>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--brand-text)" }}>{booked.existing ? `¡Qué gusto verte de nuevo, ${booked.name.split(" ")[0]}! Encontramos tu ficha.` : `Te registramos como paciente, ${booked.name.split(" ")[0]}.`}</span>
              <span style={{ fontSize: 14, color: "var(--ink-500)" }}>Te enviaremos el enlace por WhatsApp al {d.f.phone}.</span>
            </div>
            <div style={{ background: "var(--surface)", borderRadius: 16, padding: 18, boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", gap: 10, fontSize: 15 }}>
              {summary.map(([t, i]) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}><Icon name={i} style={{ color: "var(--brand-600)" }} /><span className="tnum">{t}</span></div>
              ))}
            </div>
            {d.doc === "any" && <div style={{ fontSize: 13, color: "var(--ink-500)", textAlign: "center" }}>Como no elegiste doctor, te asignamos a {bookedDoc?.name}.</div>}
            <Link href={`/mi-cita/${booked.ref}`} style={{ minHeight: 50, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Ver mi cita</Link>
            <button type="button" onClick={reset} style={{ cursor: "pointer", minHeight: 50, borderRadius: 12, boxShadow: "inset 0 0 0 1.5px var(--brand-200)", color: "var(--brand-text)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: 0, fontSize: 16 }}>Reservar otra cita</button>
          </>
        )}
      </div>

      {d.step < 4 && (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 20px", background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
          {bookErr && <div role="alert" style={{ marginBottom: 10, fontSize: 13, color: "var(--error-fg)", fontWeight: 600, lineHeight: 1.4 }}>{bookErr}</div>}
          <button type="button" onClick={next} disabled={!(can || d.step === 3)} style={{ cursor: can || d.step === 3 ? "pointer" : "not-allowed", width: "100%", minHeight: 52, borderRadius: 12, border: 0, fontSize: 16, background: can || d.step === 3 ? "var(--grad-btn)" : "var(--muted)", color: can || d.step === 3 ? "#fff" : "var(--ink-300)", fontWeight: 700 }}>
            {d.step === 3 ? (sending ? "Reservando…" : "Reservar cita") : "Continuar"}
          </button>
        </div>
      )}
    </div>
  );
}
