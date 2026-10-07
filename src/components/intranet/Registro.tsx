"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bootstrapClinic, signInWithPassword, signUp, useAuth } from "@/lib/backend/auth";
import { CLINIC_SLUG, isRemote } from "@/lib/backend/config";
import { isEmail } from "@/lib/session";
import AuthCard, { field, labelStyle, primaryBtn } from "./AuthCard";

const BOOT_ERRORS: Record<string, string> = {
  invalid_code: "El código no es válido o ya fue usado",
  already_initialized: "Esta instalación ya tiene una clínica. Pide a tu administrador que te registre con tu correo.",
  not_authenticated: "Inicia sesión primero",
};
const linkStyle: React.CSSProperties = { color: "var(--brand-text)", fontWeight: 600 };

/** Primer uso: crea la cuenta del administrador y, con el código de un solo uso, la clínica. */
export default function Registro() {
  const router = useRouter();
  const auth = useAuth();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [a, setA] = useState({ email: "", pass: "" });
  const [c, setC] = useState({ code: "", name: "", nom: "", dni: "", tel: "" });
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === "ready") router.replace("/intranet/inicio");
  }, [auth.status, router]);

  if (!isRemote) return <AuthCard title="No disponible" sub="Esta pantalla se activa al conectar Supabase."><Link href="/intranet" style={linkStyle}>Volver</Link></AuthCard>;
  if (auth.status === "loading" || auth.status === "ready") return <AuthCard title="Cargando…" />;

  async function account(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(a.email)) return setError("Ingresa un correo válido");
    if (a.pass.length < 8) return setError("La contraseña debe tener al menos 8 caracteres");
    setError("");
    setBusy(true);
    if (mode === "signin") {
      const err = await signInWithPassword(a.email.trim(), a.pass);
      if (err) setError("Correo o contraseña incorrectos");
    } else {
      const r = await signUp(a.email.trim(), a.pass);
      if (r.error) setError(r.error.message.includes("registered") ? "Ese correo ya tiene cuenta: usa «Ya tengo cuenta»" : r.error.message);
      else if (r.needsConfirm) setNote("Te enviamos un correo. Confirma tu dirección con el enlace y vuelve a esta pantalla para continuar.");
    }
    setBusy(false);
  }

  async function clinic(e: React.FormEvent) {
    e.preventDefault();
    if (c.name.trim().length < 2 || c.nom.trim().length < 2) return setError("Completa el nombre de la clínica y el tuyo");
    if (!/^\d{8}$/.test(c.dni)) return setError("El DNI tiene 8 dígitos");
    if (!c.code.trim()) return setError("Ingresa el código de configuración");
    setError("");
    setBusy(true);
    const err = await bootstrapClinic({ code: c.code.trim(), slug: CLINIC_SLUG, name: c.name.trim(), nom: c.nom.trim(), dni: c.dni, tel: c.tel });
    setBusy(false);
    if (err) setError(BOOT_ERRORS[err.message] ?? err.message);
  }

  if (auth.status === "denied") {
    return (
      <AuthCard title="Configura tu clínica" sub={`Sesión: ${auth.email}. Con el código de configuración que te entregamos se crea la clínica «${CLINIC_SLUG}» y tú quedas como administrador.`}>
        <form onSubmit={clinic} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label style={labelStyle}>Código de configuración<input value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} style={field} autoComplete="off" /></label>
          <label style={labelStyle}>Nombre de la clínica<input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} style={field} /></label>
          <label style={labelStyle}>Tu nombre completo<input value={c.nom} onChange={(e) => setC({ ...c, nom: e.target.value })} style={field} autoComplete="name" /></label>
          <label style={labelStyle}>DNI<input inputMode="numeric" maxLength={8} value={c.dni} onChange={(e) => setC({ ...c, dni: e.target.value.replace(/\D/g, "") })} style={field} /></label>
          <label style={labelStyle}>Teléfono (opcional)<input inputMode="tel" value={c.tel} onChange={(e) => setC({ ...c, tel: e.target.value })} style={field} autoComplete="tel" /></label>
          {error && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{error}</div>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? "Creando…" : "Crear clínica"}</button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={mode === "signup" ? "Crea tu cuenta" : "Inicia sesión"} sub="Primer paso para configurar tu clínica. Si tu administrador ya te registró, entra desde el inicio de sesión.">
      <form onSubmit={account} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelStyle}>Correo<input type="email" autoComplete="username" value={a.email} onChange={(e) => setA({ ...a, email: e.target.value })} style={field} /></label>
        <label style={labelStyle}>Contraseña<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={a.pass} onChange={(e) => setA({ ...a, pass: e.target.value })} style={field} /></label>
        {error && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{error}</div>}
        {note && <div role="status" style={{ fontSize: 13, color: "var(--success-fg)", fontWeight: 600, lineHeight: 1.4 }}>{note}</div>}
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? "Un momento…" : mode === "signup" ? "Crear cuenta" : "Entrar"}</button>
        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNote(""); }} style={{ ...linkStyle, background: "transparent", border: 0, cursor: "pointer", minHeight: 24, fontSize: 14 }}>
          {mode === "signup" ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
        </button>
      </form>
    </AuthCard>
  );
}
