/**
 * Mapa de la ubicación. Provisional: incrusta Google Maps por dirección (sin clave).
 * Pendiente (APIs): geocodificar la dirección real y usar Maps Embed API / Places.
 */
export default function MapEmbed({ address, title = "Mapa de la clínica" }: { address: string; title?: string }) {
  const q = encodeURIComponent(address);
  return (
    <div style={{ height: 260, borderRadius: 16, overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--line)", background: "var(--muted)", position: "relative" }}>
      <iframe title={title} src={`https://www.google.com/maps?q=${q}&output=embed`} style={{ width: "100%", height: "100%", border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ position: "absolute", right: 10, bottom: 10, padding: "8px 12px", borderRadius: 10, background: "var(--surface)", color: "var(--brand-700)", fontWeight: 700, fontSize: 13, boxShadow: "var(--shadow-md)" }}
      >
        Abrir en Google Maps
      </a>
    </div>
  );
}
