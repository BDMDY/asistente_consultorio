"use client";
import { useState } from "react";
import { CloseBtn, Modal, btnOutline, btnPrimary, fieldStyle, labelStyle } from "@/components/ui/kit";
import { newId } from "@/lib/ids";
import { type Patient, patientsStore } from "@/lib/patients";
import { isEmail } from "@/lib/session";
import { toast } from "@/lib/toast";

/** Alta de paciente; se usa desde Pacientes y desde "Nueva cita" (encima del diálogo de la cita, sin perder la navegación). */
export default function NewPatientDialog({ sheet, initial, z, toastText = "Paciente registrado", onClose, onCreated }: {
  sheet: boolean;
  /** datos ya escritos por quien busca (un DNI o un nombre) */
  initial?: { name?: string; dni?: string };
  z?: number;
  toastText?: string;
  onClose: () => void;
  onCreated: (p: Patient) => void;
}) {
  const [f, setF] = useState({ name: initial?.name ?? "", dni: initial?.dni ?? "", phone: "", email: "", alerts: "" });
  const [tried, setTried] = useState(false);
  const v = { name: f.name.trim().length > 4, dni: /^\d{8}$/.test(f.dni), phone: f.phone.replace(/\D/g, "").length >= 9, email: !f.email.trim() || isEmail(f.email.trim()) };
  const border = (ok: boolean) => (tried && !ok ? "2px solid var(--error-fg)" : "1px solid var(--line)");
  const input = (ok: boolean): React.CSSProperties => ({ ...fieldStyle, height: 46, fontSize: 15, border: border(ok) });

  function save() {
    if (!(v.name && v.dni && v.phone && v.email)) return setTried(true);
    if (patientsStore.get().some((p) => p.dni === f.dni)) return toast("Ya existe un paciente con ese DNI");
    const np: Patient = { id: newId(), name: f.name.trim(), dni: f.dni, phone: f.phone, ...(f.email.trim() ? { email: f.email.trim() } : {}), alerts: f.alerts.split(",").map((x) => x.trim()).filter(Boolean) };
    patientsStore.update((l) => [...l, np]);
    onCreated(np);
    onClose();
    toast(toastText);
  }

  return (
    <Modal onClose={onClose} width={520} label="Nuevo paciente" sheet={sheet} z={z}>
      <div style={{ padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 22 }}>Nuevo paciente</b><CloseBtn onClick={onClose} /></div>
        <label style={labelStyle}>Nombre completo<input value={f.name} autoComplete="off" onChange={(e) => setF({ ...f, name: e.target.value })} style={input(v.name)} /></label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={labelStyle}>DNI<input value={f.dni} inputMode="numeric" autoComplete="off" onChange={(e) => setF({ ...f, dni: e.target.value.replace(/\D/g, "").slice(0, 8) })} style={input(v.dni)} /></label>
          <label style={labelStyle}>Celular<input value={f.phone} type="tel" autoComplete="off" onChange={(e) => setF({ ...f, phone: e.target.value })} style={input(v.phone)} /></label>
        </div>
        <label style={labelStyle}>Correo electrónico (opcional)
          <input value={f.email} type="email" inputMode="email" autoComplete="off" placeholder="nombre@correo.com" onChange={(e) => setF({ ...f, email: e.target.value })} style={input(v.email)} />
          {tried && !v.email && <span role="alert" style={{ color: "var(--error-fg)", fontSize: 13, fontWeight: 500 }}>Revisa el correo, por ejemplo nombre@correo.com</span>}
        </label>
        <label style={labelStyle}>Alertas médicas (separadas por coma)<input value={f.alerts} placeholder="Ej. Alergia a la penicilina, Diabetes" onChange={(e) => setF({ ...f, alerts: e.target.value })} style={{ ...fieldStyle, height: 46, fontSize: 15 }} /></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" onClick={onClose} style={btnOutline}>Cancelar</button>
          <button type="button" onClick={save} style={btnPrimary()}>Guardar paciente</button>
        </div>
      </div>
    </Modal>
  );
}
