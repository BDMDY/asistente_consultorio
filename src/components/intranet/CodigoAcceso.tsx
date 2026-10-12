"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { passwordProblem, redeemStaffCode, useAuth } from "@/lib/backend/auth";
import { isRemote } from "@/lib/backend/config";
import { isEmail } from "@/lib/session";
import AuthCard, { field, labelStyle, primaryBtn } from "./AuthCard";

/** Registro del personal con el código que entrega el administrador (alternativa a la invitación por correo). */
export default function CodigoAcceso() {
  const router = useRouter();
  const auth = useAuth();
  const [f, setF] = useState({ email: "", dni: "", code: "", pass: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (auth.status === "ready") router.replace("/intranet/inicio");
  }, [auth.status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(f.email)) return setError("Ingresa un correo válido");
    if (!/^\d{8}$/.test(f.dni.trim())) return setError("El DNI tiene 8 dígitos");
    if (f.code.replace(/[^A-Za-z0-9]/g, "").length !== 8) return setError("El código tiene 8 caracteres");
    const pp = passwordProblem(f.pass);
    if (pp) return setError(pp);
    setError("");
    setBusy(true);
    const msg = await redeemStaffCode({ email: f.email.trim(), dni: f.dni.trim(), code: f.code.trim(), password: f.pass });
    setBusy(false);
    if (msg) setError(msg);
  }

  if (!isRemote) return <AuthCard title="No disponible" sub="Esta pantalla se activa al conectar la autenticación."><Link href="/intranet">Volver</Link></AuthCard>;
  return (
    <AuthCard title="Registro con código" sub="Usa el código que te entregó tu administrador. Debe coincidir con el correo y DNI con que te registraron.">
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={labelStyle}>Correo<input type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={field} /></label>
        <label style={labelStyle}>DNI<input inputMode="numeric" maxLength={8} value={f.dni} onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, "") })} style={field} /></label>
        <label style={labelStyle}>Código de acceso<input autoCapitalize="characters" autoComplete="one-time-code" placeholder="XXXX-XXXX" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} style={{ ...field, letterSpacing: ".15em", fontWeight: 700 }} /></label>
        <label style={labelStyle}>Crea tu contraseña<input type="password" autoComplete="new-password" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} style={field} /></label>
        <div style={{ fontSize: 12, color: "var(--ink-500)" }}>Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.</div>
        {error && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{error}</div>}
        <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>{busy ? "Un momento…" : "Crear mi acceso"}</button>
        <Link href="/intranet" style={{ color: "var(--brand-text)", fontWeight: 600, fontSize: 14, textAlign: "center" }}>Volver a iniciar sesión</Link>
      </form>
    </AuthCard>
  );
}
