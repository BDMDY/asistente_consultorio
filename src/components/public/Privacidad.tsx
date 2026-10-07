"use client";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { useBrand } from "@/lib/brand";

export default function Privacidad() {
  const brand = useBrand();
  const n = brand.name;
  const sections: [string, string][] = [
    ["1. Responsable del banco de datos", `${n} (domicilio: ${brand.address}) es titular del banco de datos personales de pacientes y responsable de su tratamiento, conforme a la Ley N.° 29733 y su Reglamento (D.S. N.° 003-2013-JUS).`],
    ["2. Datos que recopilamos", "Nombre completo, DNI, número de celular, correo electrónico (opcional), motivo de la cita y, durante la atención, datos de salud necesarios para su historia clínica. Los datos de salud son datos sensibles y se tratan con medidas reforzadas de seguridad."],
    ["3. Finalidad del tratamiento", "Gestionar tu reserva y recordatorios de cita, brindar atención odontológica, elaborar y conservar tu historia clínica, emitir comprobantes de pago y, solo si lo autorizas, enviarte comunicaciones sobre promociones o campañas de salud."],
    ["4. Base legal y consentimiento", "Tratamos tus datos con tu consentimiento previo, libre, expreso e informado, que otorgas al marcar la casilla en el formulario de reserva. Puedes revocarlo en cualquier momento sin efectos retroactivos."],
    ["5. Con quién compartimos tus datos", "No vendemos tus datos. Solo se comparten con proveedores que nos prestan servicios (alojamiento, mensajería por WhatsApp, facturación electrónica) bajo acuerdos de confidencialidad, y con autoridades cuando la ley lo exija."],
    ["6. Plazo de conservación", "Las historias clínicas se conservan el tiempo que exige la normativa de salud vigente. Los datos de contacto de reservas sin atención se eliminan a los 12 meses."],
    ["7. Tus derechos (ARCO)", "Puedes solicitar acceso, rectificación, cancelación y oposición respecto de tus datos personales. Si consideras que tus derechos no fueron atendidos, puedes acudir a la Autoridad Nacional de Protección de Datos Personales."],
    ["8. Seguridad", "Aplicamos controles de acceso por rol, registro de actividad y cifrado en tránsito para proteger tu información frente a accesos no autorizados."],
  ];
  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ padding: "16px 32px", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/" aria-label="Volver al sitio" style={{ color: "inherit" }}><BrandMark /></Link>
        <span style={{ flex: 1 }} />
        <Link href="/" style={{ fontWeight: 600, fontSize: 14 }}>← Volver al sitio</Link>
      </div>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 72px", display: "flex", flexDirection: "column", gap: 26 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".1em", color: "var(--brand-700)" }}>LEY N.° 29733 · PROTECCIÓN DE DATOS PERSONALES</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, lineHeight: 1.1, letterSpacing: "-.02em", margin: "8px 0 6px" }}>Aviso de privacidad</h1>
          <div style={{ color: "var(--ink-500)", fontSize: 14 }}>Última actualización: 6 de octubre de 2026</div>
        </div>
        {sections.map(([h, p]) => (
          <section key={h} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>{h}</h2>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "var(--ink-700)" }}>{p}</p>
          </section>
        ))}
        <div style={{ padding: 20, borderRadius: 16, background: "var(--grad-hero)", boxShadow: "inset 0 0 0 1px var(--brand-100)", display: "flex", flexDirection: "column", gap: 6, fontSize: 15 }}>
          <b>Ejerce tus derechos</b>
          <span>Escríbenos a <a href={`mailto:${brand.email}`}>{brand.email}</a> o por <a href={brand.waLink}>WhatsApp</a>. Responderemos en un plazo máximo de 20 días hábiles.</span>
        </div>
      </main>
    </div>
  );
}
