"use client";
import Link from "next/link";
import { useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import { STATUS_LABEL, hm } from "@/lib/agenda";
import { type FoundAppt, lookupAppts } from "@/lib/backend/public-api";
import { labelLong } from "@/lib/dates";
import { useDoctors } from "@/lib/doctors";

const field: React.CSSProperties = { height: 50, borderRadius: 12, border: "1px solid var(--line)", padding: "0 14px", fontSize: 16, background: "var(--surface)", color: "inherit", width: "100%", boxSizing: "border-box" };

/** El paciente consulta sus citas con DNI + teléfono (los mismos de la reserva) y abre "Mi cita" para confirmar, reprogramar o cancelar. */
export default function MisCitas() {
  const docs = useDoctors();
  const [f, setF] = useState({ dni: "", phone: "" });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [found, setFound] = useState<FoundAppt[] | null>(null);

  const okDni = /^\d{8}$/.test(f.dni);
  const okPhone = f.phone.replace(/\D/g, "").length >= 9;

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!okDni || !okPhone) return;
    setBusy(true);
    setError("");
    try {
      setFound(await lookupAppts(f.dni, f.phone));
    } catch {
      setError("No pudimos consultar tus citas. Intenta de nuevo en unos minutos.");
    }
    setBusy(false);
  }

  const bd = (ok: boolean) => (tried && !ok ? "2px solid var(--error-fg)" : "1px solid var(--line)");

  return (
    <div style={{ minHeight: "100vh", background: "var(--grad-hero)" }}>
      <div style={{ padding: "14px 20px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/" style={{ flex: 1, color: "inherit" }} aria-label="Ir al sitio"><BrandMark size="sm" /></Link>
        <ThemeToggle style={{ margin: "-6px -10px -6px 0" }} />
      </div>
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 48px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>Consulta tus citas</h1>
          <p style={{ color: "var(--ink-500)", margin: "6px 0 0", lineHeight: 1.5 }}>Ingresa el DNI y el teléfono que usaste al reservar.</p>
        </div>
        <form onSubmit={search} noValidate style={{ display: "flex", flexDirection: "column", gap: 14, background: "var(--surface)", padding: 20, borderRadius: 16, boxShadow: "var(--shadow-md)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>DNI
            <input inputMode="numeric" maxLength={8} autoComplete="off" value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, "") })} style={{ ...field, border: bd(okDni) }} />
            {tried && !okDni && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13 }}>El DNI tiene 8 dígitos</span>}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Teléfono
            <input type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} style={{ ...field, border: bd(okPhone) }} />
            {tried && !okPhone && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13 }}>Ingresa tu número de 9 dígitos</span>}
          </label>
          {error && <div role="alert" style={{ color: "var(--error-fg)", fontWeight: 600, fontSize: 14 }}>{error}</div>}
          <button type="submit" disabled={busy} style={{ cursor: "pointer", minHeight: 50, borderRadius: 12, border: 0, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, fontSize: 16, opacity: busy ? 0.7 : 1 }}>{busy ? "Buscando…" : "Ver mis citas"}</button>
        </form>

        {found && found.length === 0 && (
          <div role="status" style={{ background: "var(--surface)", padding: 20, borderRadius: 16, boxShadow: "var(--shadow-md)", lineHeight: 1.5 }}>
            <b>No encontramos citas con esos datos.</b>
            <div style={{ color: "var(--ink-500)", fontSize: 14, marginTop: 4 }}>Revisa que sean los mismos que usaste al reservar o <Link href="/reserva" style={{ color: "var(--brand-text)", fontWeight: 600 }}>reserva una nueva cita</Link>.</div>
          </div>
        )}
        {found && found.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }} aria-label="Tus citas">
            {found.map((a) => (
              <li key={a.ref}>
                <Link href={`/mi-cita/${a.ref}`} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", padding: 16, borderRadius: 16, boxShadow: "var(--shadow-md)", color: "inherit" }}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <b>{a.service}</b>
                    <span className="tnum" style={{ color: "var(--ink-500)", fontSize: 14 }}>{labelLong(a.date)} · {hm(a.slot)}</span>
                    <span style={{ color: "var(--ink-500)", fontSize: 13 }}>{docs.find((d) => d.id === a.doc)?.name ?? ""}</span>
                  </span>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: `var(--st-${a.status}-bg)`, color: `var(--st-${a.status}-fg)`, fontSize: 12, fontWeight: 700 }}>{STATUS_LABEL[a.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
