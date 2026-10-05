# Asistente de Consultorio — Plan de trabajo

Sistema web (PWA) para organizar consultorios de **ortodoncia / odontología** y, más adelante, **consultorios médicos** en general. Pensado desde el inicio como producto **multi-consultorio** (SaaS), aunque el primer cliente sea uno solo.

> Estado: borrador v0.1 — para discutir y ajustar antes de escribir código.

---

## 1. Visión

Un solo lugar donde el consultorio:

1. Gestiona la **agenda** (doctor y asistentes) y reprograma citas sin fricción.
2. Permite que los **pacientes vean disponibilidad y agenden/confirmen** por su cuenta.
3. Lleva el **directorio de pacientes** y su historial.
4. Controla el **inventario** de materiales con reporte diario.
5. Ve el **dinero**: ingresos, egresos y costos, con reporte diario.
6. Conoce el **rendimiento por servicio** (catálogo, precios, frecuencia, margen).
7. Hace **campañas por WhatsApp** a sus pacientes (con consentimiento).

### Usuarios (roles)

| Rol | Qué hace |
|---|---|
| **Paciente** (sin login obligatorio) | Ve disponibilidad, agenda, confirma, cancela o pide reprogramar vía link. |
| **Doctor** | Ve su agenda, pacientes, reportes y finanzas. |
| **Asistente / recepción** | Gestiona agenda, reprograma, cobra, registra inventario. |
| **Administrador del consultorio** | Todo lo anterior + usuarios, servicios, precios, campañas. |
| **Super admin (tú)** | Alta de consultorios, planes, soporte (fase SaaS). |

---

## 2. Módulos y alcance

### 2.1 Agenda y citas (núcleo)
- Vista día / semana / por profesional / por sillón (consultorio físico).
- Horarios de trabajo por profesional, bloqueos (vacaciones, almuerzo, emergencias).
- Tipos de cita con **duración** y **buffer** propios (ej. control de brackets 20 min, colocación 90 min).
- Estados: `pendiente → confirmada → en sala → atendida | cancelada | no-show | reprogramada`.
- **Reprogramar** con arrastrar y soltar + registro de motivo e historial (útil para medir cancelaciones).
- Lista de espera: si se libera un espacio, sugerir pacientes en espera.
- Detección de choques (doble reserva, sillón ocupado).

### 2.2 Portal público de disponibilidad (pacientes)
- Link por consultorio (`/c/nombre-consultorio`) mostrando **solo huecos libres**, nunca datos de otros pacientes.
- Flujo: elegir servicio → elegir horario → datos básicos → confirmación por WhatsApp/correo.
- Link único por cita para **confirmar / cancelar / pedir reprogramación** sin crear cuenta.
- Reglas configurables: anticipación mínima, límite de reprogramaciones, aprobación manual opcional.

### 2.3 Directorio de pacientes
- Ficha: datos de contacto, fecha de nacimiento, tutor (menores), alergias/antecedentes, notas, etiquetas.
- Historial de citas, tratamientos, pagos y saldo pendiente.
- Archivos adjuntos (radiografías, fotos, consentimientos) con almacenamiento privado.
- **Consentimientos** (tratamiento y comunicaciones/WhatsApp) con fecha y evidencia.
- Búsqueda rápida, importación desde Excel/CSV, deduplicación.
- *Ortodoncia:* plan de tratamiento, fases, controles mensuales, fotos antes/después, mensualidades.

### 2.4 Inventario de materiales
- Catálogo de insumos (SKU, unidad, proveedor, costo, stock mínimo, vencimiento/lote).
- Movimientos: entradas (compras), salidas (consumo), ajustes y mermas.
- **Consumo por servicio** (receta): al marcar una cita como atendida, descuenta materiales automáticamente.
- Alertas de stock bajo y de caducidad próxima.
- **Reporte diario de inventario**: apertura, movimientos, cierre, faltantes.

### 2.5 Finanzas
- Ingresos: pagos por cita/tratamiento, abonos, método de pago, saldo por paciente.
- Egresos: compras de inventario, nómina, renta, servicios, laboratorio (categorías configurables).
- **Reporte diario**: ingresos, egresos, utilidad, caja por método de pago, cuentas por cobrar.
- Costo por servicio = materiales + tiempo/sillón (+ laboratorio) → **margen real por servicio**.
- Exportación a Excel/PDF.

### 2.6 Catálogo y reporte de servicios
- Servicios con precio, duración, categoría, materiales asociados, doctor(es) habilitados.
- Reporte: servicios más solicitados, ingreso y margen por servicio, tiempo promedio real vs. planificado.

### 2.7 Campañas y mensajería (WhatsApp)
- Segmentación (por etiqueta, último servicio, inactividad, cumpleaños, tratamiento activo).
- Plantillas aprobadas, programación de envío, métricas (enviado, entregado, leído, respondió).
- Mensajes **automáticos transaccionales**: recordatorio 24 h / 2 h, confirmación, post-cita, cobro pendiente.
- Opt-in / opt-out obligatorio, y límite de envío.

### 2.8 Reportes y panel
- Dashboard del día: citas, ocupación, ingresos, faltantes de inventario.
- Reportes diarios consolidados (inventario + finanzas) enviados al doctor por correo/WhatsApp.
- Tasa de no-show, ocupación por sillón, pacientes nuevos vs. recurrentes, retención.

---

## 3. Mi punto de vista (decisiones importantes)

1. **WhatsApp: usar la API oficial (WhatsApp Business Platform / Cloud API), no soluciones "no oficiales".**
   - Enviar masivo desde un número normal o con librerías no oficiales (tipo WhatsApp Web) **causa baneo del número**; en un consultorio, perder el número de contacto es un desastre.
   - La API oficial exige **plantillas aprobadas** para mensajes iniciados por el negocio y tiene **costo por conversación/mensaje** (categorías marketing/utilidad). Hay que incluirlo en el modelo de precios.
   - Los mensajes **transaccionales** (recordatorios) son baratos y de alto valor; las campañas de marketing son más caras y regulados. Empezar por recordatorios.
   - Proveedores intermedios (Twilio, 360dialog, etc.) simplifican el onboarding; decidir en la fase 4.
2. **El mayor ROI temprano son los recordatorios automáticos**, no las campañas: bajan el no-show (típicamente 20–30 % en clínicas). Lo pondría antes que el marketing masivo.
3. **Privacidad de datos de salud**: son datos sensibles. Desde el día 1: cifrado en tránsito/reposo, acceso por roles, auditoría de quién ve qué, consentimientos y política de retención. Revisar la normativa del país donde se venderá (ej. LFPDPPP en México, Ley 29733 en Perú, HIPAA si hubiera EE. UU.).
4. **Multi-consultorio desde el diseño** (columna `clinic_id` en todo + políticas de acceso por fila). Es mucho más barato hacerlo ahora que migrar luego.
5. **PWA antes que app nativa**: instalable en celular, notificaciones, un solo código. App nativa solo si hay necesidad real.
6. **Mobile-first para recepción y doctor**: la agenda se consulta desde el teléfono entre pacientes.
7. **Ortodoncia merece un módulo propio** (plan de tratamiento, controles recurrentes, mensualidades). Es el mejor diferenciador frente a software genérico de agenda médica.
8. **Empezar con un consultorio piloto real** y desplegar rápido: validar flujos con gente usándolo antes de construir todos los módulos.

---

## 4. Propuestas extra (ordenadas por valor/esfuerzo)

| # | Propuesta | Valor | Esfuerzo |
|---|---|---|---|
| 1 | Recordatorios y confirmación automática por WhatsApp (botones Confirmar / Reprogramar) | Muy alto | Medio |
| 2 | Lista de espera con relleno automático de cancelaciones | Alto | Bajo |
| 3 | Control de mensualidades de ortodoncia con recordatorio de pago | Alto | Medio |
| 4 | Consentimientos informados con firma digital | Alto (legal) | Medio |
| 5 | Odontograma digital | Medio-alto | Medio-alto |
| 6 | Reporte diario automático al doctor (resumen del día por WhatsApp/correo) | Alto | Bajo |
| 7 | Encuesta de satisfacción post-cita + solicitud de reseña en Google | Medio | Bajo |
| 8 | Asistente IA: resumir historial, redactar mensajes de campaña, sugerir reprogramaciones, responder preguntas frecuentes de pacientes | Medio-alto | Medio |
| 9 | Pagos en línea (anticipo/depósito para reservar) | Alto | Medio |
| 10 | Facturación electrónica (según país) | Alto (obligatorio en muchos) | Alto |
| 11 | Integración con Google Calendar del doctor | Medio | Bajo |
| 12 | Programa de referidos / fidelización | Medio | Medio |
| 13 | Modo offline básico para agenda | Bajo-medio | Alto |

---

## 5. Stack tecnológico propuesto

Elegido para avanzar rápido, con bajo costo inicial y escalable:

| Capa | Propuesta | Por qué |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Ecosistema grande, SSR para el portal público, buen encaje con diseño exportado desde Claude Design. |
| Backend / BD | **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions) | Row Level Security ideal para multi-consultorio; auth y archivos incluidos. |
| Hosting | **Vercel** | Despliegues por PR, previews, cron jobs. |
| Mensajería | **WhatsApp Cloud API** (directo o vía BSP) + correo (Resend) | Ver sección 3.1. |
| Tareas programadas | Supabase `pg_cron` / Vercel Cron + cola (ej. Inngest o `pgmq`) | Recordatorios, reportes diarios, campañas. |
| Calendario UI | FullCalendar o `react-big-calendar` (evaluar) | Drag & drop, vistas día/semana/recursos. |
| Validación | Zod | Tipos compartidos front/back. |
| Pruebas | Vitest + Playwright | Unitarias y flujos críticos (agendar, reprogramar). |
| Observabilidad | Sentry + logs de Supabase | Errores en producción. |
| Calidad | ESLint, Prettier, GitHub Actions (lint + test + build) | CI desde el inicio. |

> Alternativa si prefieres no depender de Supabase: Postgres administrado + NestJS. Más control, más trabajo. Mi recomendación es Supabase para el MVP.

---

## 6. Modelo de datos (borrador)

```
clinics(id, name, slug, timezone, country, settings)
users(id, clinic_id, role, name, email, phone, active)            -- doctor, asistente, admin
professionals(id, clinic_id, user_id, specialty, color)
chairs(id, clinic_id, name)                                       -- sillones/consultorios

patients(id, clinic_id, name, phone, email, birth_date, guardian, allergies,
         notes, tags[], whatsapp_opt_in, opt_in_at, source)
patient_files(id, patient_id, type, storage_path, created_at)

services(id, clinic_id, name, category, price, duration_min, buffer_min, active)
service_materials(service_id, material_id, qty)                   -- receta de consumo

working_hours(id, professional_id, weekday, start, end)
time_blocks(id, professional_id|chair_id, starts_at, ends_at, reason)

appointments(id, clinic_id, patient_id, professional_id, chair_id, service_id,
             starts_at, ends_at, status, source, notes, public_token)
appointment_events(id, appointment_id, type, from, to, reason, by_user, at)  -- historial/reprogramaciones
waitlist(id, clinic_id, patient_id, service_id, preferred_window)

treatment_plans(id, patient_id, name, total, status)              -- ortodoncia
treatment_visits(id, plan_id, appointment_id, notes, next_visit_in_days)

materials(id, clinic_id, name, sku, unit, cost, min_stock, supplier_id)
inventory_lots(id, material_id, lot, expires_at, qty)
inventory_movements(id, material_id, type, qty, unit_cost, ref, at, by_user)
suppliers(id, clinic_id, name, contact)
daily_inventory_reports(id, clinic_id, date, snapshot jsonb)

payments(id, clinic_id, patient_id, appointment_id|plan_id, amount, method, at, by_user)
expenses(id, clinic_id, category, amount, method, description, at, by_user)
daily_financial_reports(id, clinic_id, date, income, expenses, snapshot jsonb)

message_templates(id, clinic_id, name, channel, body, wa_template_id, status)
campaigns(id, clinic_id, name, template_id, segment jsonb, scheduled_at, status)
message_log(id, clinic_id, campaign_id, patient_id, channel, status, error, at)
consents(id, patient_id, type, granted, at, evidence)
audit_log(id, clinic_id, user_id, action, entity, entity_id, at)
```

Seguridad: **RLS por `clinic_id`** en todas las tablas; el portal público solo accede a vistas/funciones restringidas (disponibilidad y cita por token).

---

## 7. Hoja de ruta por fases

### Fase 0 — Cimientos (1 semana)
- Estructura del repo, Next.js + Supabase + CI, entornos (dev / staging / prod).
- Auth, roles, multi-consultorio con RLS, layout base.
- Importar el diseño de Claude Design (sistema de componentes y tokens).
- **Entregable:** login funcionando y despliegue automático.

### Fase 1 — MVP de agenda + pacientes (2–3 semanas)
- Pacientes (CRUD, búsqueda, importación CSV).
- Servicios y horarios de profesionales.
- Agenda interna: crear, mover, cancelar, reprogramar, estados, historial.
- **Entregable:** el consultorio piloto reemplaza su agenda actual.

### Fase 2 — Portal del paciente y recordatorios (2 semanas)
- Disponibilidad pública y reserva online.
- Link de confirmar/cancelar/reprogramar.
- Recordatorios por correo (y WhatsApp transaccional si ya está aprobada la cuenta).
- **Entregable:** reducción medible de no-shows.

### Fase 3 — Inventario y finanzas (3 semanas)
- Materiales, movimientos, lotes, stock mínimo, consumo por servicio.
- Pagos, egresos, caja diaria.
- **Reportes diarios** de inventario y finanzas + exportación.
- **Entregable:** el doctor recibe cada noche su resumen.

### Fase 4 — WhatsApp y campañas (2–3 semanas)
- Alta de WhatsApp Business API, plantillas, opt-in/opt-out.
- Segmentos, campañas programadas, métricas, límites de envío.
- **Entregable:** primera campaña real a pacientes con consentimiento.

### Fase 5 — Ortodoncia y analítica (2–3 semanas)
- Planes de tratamiento, mensualidades, fotos, odontograma (opcional).
- Reportes de servicios, margen, ocupación, retención.

### Fase 6 — Producto SaaS (continuo)
- Alta de nuevos consultorios, planes y facturación, onboarding, soporte.
- Facturación electrónica, pagos en línea, asistente IA.

---

## 8. Cómo vamos a trabajar

1. **Tú** pasas los prompts/diseños de Claude Design por módulo.
2. **Yo** convierto cada diseño en componentes y lo conecto a datos reales.
3. Trabajo en **ramas pequeñas por funcionalidad** y PRs revisables (una fase = varios PRs).
4. Cada módulo se entrega con **pruebas** de sus flujos críticos y datos de ejemplo (*seed*).
5. Entorno **staging** en Vercel para que pruebes antes de producción.
6. Al cerrar cada fase hacemos una demo y ajustamos el siguiente alcance.

Convenciones propuestas:
- Commits en español, formato `tipo: descripción` (`feat:`, `fix:`, `docs:`, `chore:`).
- Rama principal `main`; ramas `feat/<modulo>-<tema>`.
- Migraciones SQL versionadas en `supabase/migrations/`.
- Estructura sugerida:

```
/
├─ app/                  # rutas Next.js (panel, portal público)
├─ components/           # UI (design system)
├─ lib/                  # utilidades, clientes (supabase, whatsapp)
├─ server/               # lógica de dominio (agenda, inventario, finanzas)
├─ supabase/migrations/  # esquema y RLS
├─ tests/
└─ docs/                 # decisiones (ADR), prompts de diseño
```

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Baneo del número de WhatsApp por envíos masivos | API oficial, plantillas aprobadas, opt-in, límites y segmentación. |
| Fuga de datos de pacientes | RLS, cifrado, auditoría, pruebas de acceso, mínimos privilegios. |
| Alcance demasiado grande | MVP por fases; piloto real; lo no crítico queda en el backlog. |
| Choques/doble reserva | Restricción en BD (exclusion constraint) además de validación en UI. |
| Zonas horarias / horario de verano | Guardar en UTC, mostrar en zona del consultorio. |
| Costos de WhatsApp no previstos | Medir por conversación, mostrar consumo, incluirlo en el precio del plan. |
| Cumplimiento legal (datos de salud, facturación) | Definir país objetivo pronto y revisar con asesoría legal. |

---

## 10. Preguntas abiertas (necesito tu input)

1. **País/ciudad** objetivo → afecta WhatsApp, facturación, moneda y normativa de datos.
2. ¿El primer cliente es un consultorio **real** (piloto) o desarrollamos primero y buscamos clientes después?
3. ¿Cuántos **doctores, asistentes y sillones** tiene el consultorio piloto?
4. ¿Hoy cómo llevan la agenda (papel, Excel, Google Calendar, otro software)? ¿Hay datos que importar?
5. ¿Ya tienen un **número de WhatsApp Business**? ¿Lo usan a diario con pacientes?
6. ¿Los pacientes **pagan en la cita**, por mensualidades, o con seguros/convenios?
7. ¿Se necesita **facturación electrónica** desde el inicio?
8. ¿Idioma único (español) o multi-idioma?
9. Modelo de negocio: ¿suscripción mensual por consultorio? ¿Cobro por doctor/usuario?
10. ¿Algún nombre de producto o marca ya definido?

---

## 11. Próximos pasos inmediatos

- [ ] Responder las preguntas abiertas (sección 10).
- [ ] Confirmar el stack (sección 5) o proponer cambios.
- [ ] Pasarme el primer prompt de **Claude Design** (sugerencia: *agenda semanal* y *ficha de paciente*).
- [ ] Yo inicializo la **Fase 0** (repo, CI, auth, esquema base con RLS).
