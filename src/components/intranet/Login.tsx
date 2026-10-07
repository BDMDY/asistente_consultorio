"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import Icon from "@/components/ui/Icon";
import { sendReset, signInWithPassword, useAuth } from "@/lib/backend/auth";
import { isRemote } from "@/lib/backend/config";
import { useMounted } from "@/lib/hooks";
import { isEmail, sessionStore, signIn } from "@/lib/session";
import { toast } from "@/lib/toast";
import Toaster from "./Toaster";

type View = "login" | "recover" | "sent";

const input = (border = "1px solid var(--line)"): React.CSSProperties => ({ height: 48, borderRadius: 12, padding: "0 14px", fontSize: 15, background: "var(--surface)", border, color: "inherit", width: "100%", boxSizing: "border-box" });
const primary: React.CSSProperties = { cursor: "pointer", height: 48, borderRadius: 12, background: "var(--grad-btn)", color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: 0, fontSize: 15, width: "100%" };
const link: React.CSSProperties = { cursor: "pointer", fontWeight: 600, color: "var(--brand-text)", background: "transparent", border: 0, padding: 0, minHeight: 24, fontSize: 14 };
const h1: React.CSSProperties = { fontSize: 32, fontWeight: 800, letterSpacing: "-.02em", margin: 0 };

export default function Login() {
  const router = useRouter();
  const mounted = useMounted();
  const auth = useAuth();
  const [session] = sessionStore.useStore();
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>("login");
  const [f, setF] = useState({ email: "", pass: "", rec: "" });
  const [error, setError] = useState("");
  const [recErr, setRecErr] = useState(false);

  useEffect(() => {
    if (mounted && session) router.replace("/intranet/inicio");
  }, [mounted, session, router]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!isEmail(f.email) || !f.pass) {
      setError("Ingresa tu correo y contraseña");
      return;
    }
    setError("");
    if (isRemote) {
      setBusy(true);
      const err = await signInWithPassword(f.email.trim(), f.pass);
      setBusy(false);
      if (err) setError(/not confirmed/i.test(err.message) ? "Confirma tu correo con el enlace que te enviamos" : "Correo o contraseña incorrectos");
      return; // al iniciar sesión se cargan los datos y esta pantalla redirige sola
    }
    signIn(f.email);
    router.push("/intranet/inicio");
  }

  async function recover() {
    if (!isEmail(f.rec)) return setRecErr(true);
    setRecErr(false);
    if (isRemote) await sendReset(f.rec.trim()); // no revela si el correo existe
    setView("sent");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--grad-hero)", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }} className="da-login">
      <style>{`@media (max-width: 859px){.da-login{grid-template-columns:minmax(0,1fr)!important}.da-login-art{display:none!important}}`}</style>
      <div style={{ padding: "48px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20, maxWidth: 520, margin: "0 auto", width: "100%", boxSizing: "border-box", position: "relative" }}>
        <div style={{ position: "absolute", top: 12, right: 12 }}><ThemeToggle /></div>
        <BrandMark />

        {view === "login" && (
          <form onSubmit={login} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h1 style={h1}>Bienvenido de nuevo</h1>
              <div style={{ color: "var(--ink-500)", marginTop: 4 }}>Ingresa con tu cuenta del personal.</div>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Correo
              <input type="email" autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={input()} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Contraseña
              <input type="password" autoComplete="current-password" placeholder="Tu contraseña" value={f.pass} onChange={(e) => setF({ ...f, pass: e.target.value })} style={input()} />
            </label>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" style={link} onClick={() => { setF({ ...f, rec: f.email }); setView("recover"); }}>Recuperar contraseña</button>
            </div>
            {error && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>{error}</div>}
            {isRemote && auth.status === "denied" && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>Tu cuenta aún no está asociada a una clínica. Pide a tu administrador que te registre con este correo. Si eres quien configura la clínica por primera vez, <Link href="/intranet/registro" style={{ color: "var(--brand-text)" }}>crea la clínica aquí</Link>.</div>}
            <button type="submit" disabled={busy} style={{ ...primary, opacity: busy ? 0.7 : 1 }}>{busy ? "Ingresando…" : "Iniciar sesión"}</button>
            <button type="button" onClick={() => toast("El acceso con Google se activa al conectar la autenticación")} style={{ ...primary, background: "var(--surface)", color: "inherit", boxShadow: "inset 0 0 0 1px var(--line)", fontWeight: 600, gap: 8 }}>
              <GoogleG />Entrar con Google
            </button>
          </form>
        )}

        {view === "recover" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <button type="button" style={{ ...link, display: "flex", gap: 6, alignItems: "center" }} aria-label="Volver" onClick={() => setView("login")}><Icon name="arrow-left" size={16} />Volver</button>
            <div>
              <h1 style={h1}>Recupera tu contraseña</h1>
              <div style={{ color: "var(--ink-500)", marginTop: 4 }}>Te enviaremos un enlace para crear una nueva. Vence en 30 minutos.</div>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14, fontWeight: 600 }}>Correo del personal
              <input type="email" value={f.rec} onChange={(e) => { setF({ ...f, rec: e.target.value }); setRecErr(false); }} style={input(recErr ? "2px solid var(--error-fg)" : undefined)} />
            </label>
            {recErr && <div role="alert" style={{ fontSize: 13, color: "var(--error-fg)", fontWeight: 600 }}>Ingresa un correo válido, por ejemplo nombre@clinica.pe</div>}
            <button type="button" style={primary} onClick={recover}>Enviar enlace</button>
          </div>
        )}

        {view === "sent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success-fg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="mail-check" size={28} /></span>
            <div>
              <h1 style={h1}>Revisa tu correo</h1>
              <div style={{ color: "var(--ink-500)", marginTop: 4, lineHeight: 1.5 }}>Si <b>{f.rec}</b> está registrado, recibirás un enlace en unos minutos. Revisa también la carpeta de spam.</div>
            </div>
            <button type="button" style={primary} onClick={() => setView("login")}>Volver a iniciar sesión</button>
            <button type="button" style={{ ...link, textAlign: "center" }} onClick={recover}>Reenviar enlace</button>
          </div>
        )}
      </div>
      <div className="da-login-art" aria-hidden="true" style={{ margin: 24, borderRadius: 24, background: "repeating-linear-gradient(135deg,var(--brand-100) 0 14px,var(--brand-50) 14px 28px)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand-text)", fontWeight: 600, fontSize: 14 }}>foto / ilustración de marca</div>
      <Toaster />
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
