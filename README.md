# DentAssist

Plataforma web (SaaS) para consultorios de odontología, ortodoncia y medicina: agenda, pacientes e historia clínica, inventario, finanzas, campañas y sitio público white-label por empresa. Ver [`PLAN.md`](PLAN.md) para la visión y la hoja de ruta.

## Stack
Next.js 16 (App Router) · TypeScript · Tailwind 3 (preset de marca por variables CSS) · Supabase · Vercel.

## Desarrollo
```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck && npm run lint && npm test
```

## Estructura
- `src/app/(public)/`: sitio público de la empresa (`/`, `/reserva`, `/mi-cita/[id]`, `/privacidad`).
- `src/app/intranet/`: acceso del personal (`/intranet`) y aplicación (`inicio`, `agenda`, `pacientes`, `modulos/[mod]`, `marca`, `medios`).
- `src/components/`: pantallas y componentes.
- `src/lib/`: dominio (agenda, fechas, marca, medios, pacientes), con pruebas `*.test.ts`.
- `src/styles/tokens.css`: tokens de diseño (marca 50–950, estados, modo oscuro). `tailwind.preset.cjs` los expone a Tailwind.
- `design/prototipo/`: handoff de Claude Design (referencia, no es código de producción). El Índice del prototipo es solo para el equipo y el cliente: no forma parte de la app.

## Modo demo y datos
Los datos viven por ahora en `localStorage` (`src/lib/store.ts`), con la misma API que tendrá el adaptador de Supabase. La marca de la empresa (color, logo, textos) y los medios (fotos, doctores, servicios) salen de ese almacén y se aplican con variables CSS (`BrandProvider`).

## Integraciones pendientes (APIs)
- WhatsApp Business (envío de confirmaciones, recordatorios y campañas): hoy solo enlaces `wa.me`.
- Mapas: hoy incrustación por dirección; falta geocodificar con la API.
