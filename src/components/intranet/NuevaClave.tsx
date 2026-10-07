"use client";
import Link from "next/link";
import { useState } from "react";
import { updatePassword, useAuth } from "@/lib/backend/auth";
import { isRemote } from "@/lib/backend/config";
import AuthCard, { field, labelStyle, primaryBtn } from "./AuthCard";

export default function NuevaClave() {
  const auth = useAuth();
  const [pass, setPass] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pass.length < 8) return setError("Usa al menos 8 caracteres");
    if (pass !== again) return setError("Las contraseñas no coinciden");
    const err = await updatePassword(pass);
    if (err) return setError("El enlace venció. Pide uno nuevo desde «Recuperar contraseña».");
    setDone(true);
  }

  if (!isRemote) return <AuthCard title="No disponible" sub="Esta pantalla se activa al conectar la autenticación."><Link href="/intranet">Volver</Link></AuthCard>;
  if (done) return <AuthCard title="Contraseña actualizada" sub="Ya puedes usar tu nueva contraseña."><Link href="/intranet/inicio" style={primaryBtn}>Ir a la intranet</Link></AuthCard>;
  if (auth.status === "anon") return <AuthCard title="Enlace no válido" sub="Abre el enlace del correo de recuperación o pide uno nuevo."><Link href="/intranet" style={{ color: "var(--brand-text)", fontWeight: 600 }}>Volver a iniciar sesión</Link></AuthCard>;

  return (
    <AuthCard title="Crea tu nueva contraseña" sub="Mínimo 8 caracteres.">
      <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label style={labelStyle}>Nueva contraseña<input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} style={field} /></label>
        <label style={labelStyle}>Repite la contraseña<input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} style={field} /></label>
        {error && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{error}</div>}
        <button type="submit" style={primaryBtn}>Guardar contraseña</button>
      </form>
    </AuthCard>
  );
}
