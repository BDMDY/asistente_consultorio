# DentAssist — Plan de trabajo

Sistema web (PWA) para organizar consultorios de **ortodoncia / odontología** y, más adelante, **consultorios médicos** en general. Pensado desde el inicio como producto **multi-consultorio** (SaaS), aunque el primer cliente sea uno solo.

> Estado: borrador v0.1 — para discutir y ajustar antes de escribir código.

---

## 0. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Nombre del producto | **DentAssist** |
| País | **Perú** — moneda PEN, zona horaria `America/Lima`, facturación electrónica SUNAT, Ley 29733 (datos personales) |
| Stack | **Next.js + TypeScript + Tailwind + Supabase + Vercel** |
| Piloto | En negociación; se construye con datos de ejemplo y se ajusta al confirmarse |
| Supabase | Proyecto **DentAssist**, región `sa-east-1` (São Paulo), ref `wqfcatarukeobrxgokbx`, org PMAVILA Org |
| Vercel | Proyecto `asistente_consultorio` en PMAVILA Org, conectado a este repo (renombrar a `dentassist` más adelante) |

---

## Estado de implementación (modo demo)

Todo el diseño de Claude Design está implementado en Next.js (rama `claude/magical-dijkstra-g5o3bs`), con los datos en el navegador (`localStorage`) detrás de una capa de datos pensada para cambiar a Supabase sin tocar las pantallas.

| Área | Estado |
|---|---|
| Sitio público: landing, reserva en 5 pasos, "Mi cita", privacidad, banner de consentimiento | Hecho |
| Intranet: acceso y recuperación, navegación, inicio, permisos por rol | Hecho |
| Agenda: grilla por doctor, arrastrar/teclado, series con vista previa, reprogramar, cobrar, cancelar con deshacer | Hecho |
| Pacientes: historia clínica, historia inicial (formato del consultorio), odontograma, plan, archivos, pagos | Hecho |
| Módulos: planes, inventario, finanzas, servicios, campañas, reportes, configuración | Hecho |
| Marca y medios white-label (color libre AA, tipografía, logos, fotos, vista previa en vivo) | Hecho |
| Móvil y modo oscuro | Hecho (diseño responsivo, mismas pantallas) |
| Supabase: esquema, RLS, autenticación, almacenamiento de archivos | Pendiente |
| WhatsApp (envío real), mapas (geocodificación), facturación electrónica, pagos en línea | Pendiente (APIs). Hoy los avisos quedan en una cola de salida (`outbox`) |
| Índice, Dirección visual y Componentes del handoff | No van en la app (son para el equipo y el cliente); quedan en `design/prototipo/` |

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

### 2.3.1 Historia clínica / historial del paciente
Línea de tiempo cronológica de todo lo que ha pasado con el paciente, visible desde su ficha:
- **Anamnesis inicial**: motivo de consulta, antecedentes médicos, alergias, medicación, hábitos (editable y versionada).
- **Evolución por visita** (nota SOAP simplificada): qué se hizo, hallazgos, diagnóstico, procedimiento, materiales usados, indicaciones, próxima cita.
- **Tratamientos realizados y en curso**, con fecha, profesional, pieza dental (si aplica) y costo.
- **Adjuntos en la línea de tiempo**: radiografías, fotos, estudios, consentimientos firmados.
- **Pagos y saldo** ligados a cada tratamiento.
- Filtros por tipo (tratamiento, nota, pago, archivo, comunicación) y por profesional.
- **Inmutabilidad y auditoría**: las notas firmadas no se editan; las correcciones se agregan como *adenda* con autor y fecha. Registro de quién consultó la historia.
- Exportar/imprimir resumen clínico en PDF (para derivaciones o solicitud del paciente).

### 2.3.2 Planes de tratamiento y series de citas
Para tratamientos de largo plazo (ortodoncia, endodoncia por fases, implantes, blanqueamientos por sesiones, etc.):
- **Plan de tratamiento**: nombre, diagnóstico, objetivo, fases/etapas, duración estimada, costo total y forma de pago, estado (`propuesto → aceptado → en curso → pausado → completado | cancelado`).
- **Fases y sesiones**: cada fase tiene N sesiones con servicio, duración y notas previstas.
- **Generador de citas en serie** (lo que describes): el doctor indica *"5 sábados, 10:00, desde el 12/10"* y el sistema:
  - propone todas las fechas según un patrón (semanal, cada 2 semanas, mensual, días específicos);
  - **valida disponibilidad** y marca los choques (feriados, bloqueos, citas existentes);
  - permite **ajustar individualmente** las que choquen (mover a otro horario o saltar la fecha);
  - muestra una **vista previa** y crea todas las citas de una vez, ligadas al plan.
- **Edición de la serie**: mover "solo esta", "esta y las siguientes" o "toda la serie"; si se cancela una, ofrecer agregar una al final para completar las sesiones previstas.
- **Avance del plan**: sesiones realizadas / total, próximas citas, saldo, alertas si el paciente se atrasa o no tiene siguiente cita agendada.
- **Presupuesto y aceptación**: el paciente ve y acepta el plan (con firma digital) antes de arrancar; el plan alimenta cobros por sesión o por mensualidad.
- **Recordatorios en bloque**: el paciente recibe el calendario completo del tratamiento (WhatsApp/correo/archivo .ics) y recordatorios individuales por sesión.
- **Plantillas de plan** por tratamiento (ej. "Ortodoncia 24 meses", "Blanqueamiento 3 sesiones") para crear planes en segundos.

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

### 2.7.1 Sistema de notificaciones (consultorio ↔ paciente)
Motor único de notificaciones, **bidireccional**: el consultorio informa y el paciente responde, y esa respuesta actualiza la cita automáticamente.

**Eventos que notifican al paciente**
| Evento | Mensaje | Respuesta del paciente |
|---|---|---|
| Cita creada / plan agendado | Confirmación con fecha, hora, doctor, dirección y enlace al mapa. Para series: calendario completo. | Confirmar |
| **Cita reprogramada** por el consultorio | "Tu cita pasó de X a Y" | Aceptar nueva fecha / Pedir otra |
| Cita cancelada por el consultorio | Aviso + opciones para reagendar | Reagendar |
| **Cuenta regresiva / recordatorios** | Configurables: 7 días, 48 h, 24 h, 2 h antes ("faltan 2 días para tu cita") | Confirmar / Reprogramar / Cancelar |
| Cita sin confirmar | Insistencia escalonada (WhatsApp → correo → llamada sugerida a recepción) | Confirmar |
| Hueco liberado (lista de espera) | "Se liberó un espacio hoy a las 4 pm" | Tomar / Rechazar |
| Post-cita | Indicaciones, encuesta, solicitud de reseña, próxima cita | Calificar |
| Cobro pendiente / mensualidad | Recordatorio de pago con enlace | Pagar |
| Paciente atrasado en su tratamiento | "Hace 6 semanas que no vienes, agenda tu control" | Agendar |

**Respuestas del paciente** (por botones de WhatsApp o por enlace único, sin crear cuenta):
- **Confirmar** → la cita pasa a `confirmada`.
- **Reprogramar** → ve solo huecos libres y elige; el sistema valida reglas (anticipación mínima, máximo de reprogramaciones) y puede pedir aprobación del asistente.
- **Cancelar** → pide motivo opcional, libera el espacio y activa la lista de espera.
- **Sin respuesta** → regla configurable (recordar de nuevo, marcar "sin confirmar", alertar a recepción).
- Si el paciente responde texto libre ("llego 10 min tarde"), llega a una **bandeja de entrada** de recepción en vez de perderse.

**Para el consultorio (notificaciones internas)**
- Aviso en el panel/PWA/correo: paciente confirmó, canceló, pidió reprogramar, no responde, llegó tarde; stock bajo; pagos recibidos.
- Bandeja de entrada de mensajes de pacientes con estados (nuevo / atendido).
- Preferencias por usuario (qué eventos y por qué canal recibe cada rol).

**Cómo funciona (arquitectura)**
- Cada cambio relevante (cita creada/movida/cancelada) emite un **evento de dominio**; un **motor de reglas** decide qué plantilla enviar, a quién, por qué canal y cuándo.
- **Cola con reintentos** y programación (recordatorios se calculan desde `starts_at` y se **recalculan/cancelan** si la cita se mueve).
- **Canales y fallback**: WhatsApp → SMS/correo si falla o el paciente no tiene WhatsApp. Push web (PWA) para el personal.
- Respeto de **horario de silencio** (no enviar de noche), **zona horaria** del consultorio y **preferencias/opt-out** del paciente.
- **Idempotencia** (no enviar dos veces el mismo recordatorio) y **registro completo** de entrega/lectura/respuesta en `message_log`.
- Plantillas editables por consultorio con variables (`{{paciente}}`, `{{fecha}}`, `{{doctor}}`, `{{enlace}}`) y aprobación de WhatsApp.
- Enlaces de acción **firmados y con vencimiento** (un solo uso para cancelar/confirmar) para evitar suplantación.

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
8. **Plan de tratamiento como eje del sistema**: la historia clínica, la agenda, los cobros y los recordatorios deben colgar del plan. Así "agendar 5 sábados" no es crear 5 citas sueltas, sino una **serie ligada a un plan** que se puede mover, medir y cobrar como un todo. Es el diferenciador más fuerte del producto.
9. **Historia clínica inmutable**: las notas firmadas no se editan, se corrigen con adendas. Protege al doctor legalmente y es requisito en muchos países. Definir los campos obligatorios según la normativa local (ej. NOM-004 en México).
10. **Citas en serie con revisión humana**: el sistema propone y valida, pero el asistente confirma la vista previa. Evita agendar sobre feriados o choques sin darse cuenta.
11. **Empezar con un consultorio piloto real** y desplegar rápido: validar flujos con gente usándolo antes de construir todos los módulos.

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
| 14 | Plantillas de plan de tratamiento (ej. "Ortodoncia 24 meses") para crear planes en segundos | Alto | Bajo |
| 15 | Alerta de abandono: paciente en tratamiento sin próxima cita o con retraso → aviso al asistente y mensaje automático | Alto | Bajo |
| 16 | Archivo .ics / enlace de calendario con todas las citas del tratamiento para el paciente | Medio | Bajo |
| 17 | Dictado por voz de notas clínicas con transcripción y resumen por IA (el doctor revisa y firma) | Alto | Medio |
| 18 | Comparador de fotos/radiografías en línea de tiempo (antes/después) | Medio-alto | Medio |
| 19 | Presupuestos con opciones (A/B) que el paciente acepta desde su celular | Alto | Medio |

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

medical_history(id, patient_id, version, data jsonb, updated_by, at)   -- anamnesis versionada
clinical_entries(id, clinic_id, patient_id, appointment_id, professional_id, type,
                 soap jsonb, tooth, service_id, signed_at, addendum_of)  -- línea de tiempo; firmada = inmutable

treatment_plan_templates(id, clinic_id, name, phases jsonb)
treatment_plans(id, clinic_id, patient_id, professional_id, name, diagnosis, total,
                payment_mode, status, accepted_at, signature_path, starts_on, est_end_on)
treatment_phases(id, plan_id, position, name, planned_sessions, status)
treatment_sessions(id, phase_id, service_id, planned_duration, appointment_id, status)
appointment_series(id, plan_id, rule jsonb, created_by)           -- patrón: ej. {freq: weekly, byday: SA, count: 5}
-- appointments.series_id y appointments.session_id enlazan cada cita con su serie/sesión

materials(id, clinic_id, name, sku, unit, cost, min_stock, supplier_id)
inventory_lots(id, material_id, lot, expires_at, qty)
inventory_movements(id, material_id, type, qty, unit_cost, ref, at, by_user)
suppliers(id, clinic_id, name, contact)
daily_inventory_reports(id, clinic_id, date, snapshot jsonb)

payments(id, clinic_id, patient_id, appointment_id|plan_id, amount, method, at, by_user)
expenses(id, clinic_id, category, amount, method, description, at, by_user)
daily_financial_reports(id, clinic_id, date, income, expenses, snapshot jsonb)

notification_rules(id, clinic_id, event, offset_minutes, channel_order[], template_id, active)
                                                                  -- ej. cita.starts_at - 24h → WhatsApp, fallback correo
notification_queue(id, clinic_id, appointment_id, patient_id, rule_id, channel, send_at,
                   status, attempts, dedupe_key)                  -- recalculada si la cita se mueve
patient_responses(id, appointment_id, patient_id, action, payload, via, at)  -- confirmó/canceló/reprogramó/texto libre
action_links(token_hash, appointment_id, action, expires_at, used_at)
inbox_messages(id, clinic_id, patient_id, direction, body, status, handled_by, at)
user_notifications(id, user_id, type, payload, read_at, at)       -- notificaciones internas
notification_prefs(id, patient_id|user_id, channel, event_type, enabled, quiet_hours)
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

### Fase 1.5 — Historia clínica y planes de tratamiento (2–3 semanas)
- Anamnesis y línea de tiempo clínica con notas firmadas, adendas y adjuntos.
- Planes de tratamiento con fases y sesiones.
- **Generador de citas en serie** (patrones, validación de choques, vista previa, edición "esta / siguientes / todas").
- Avance del plan y alerta de pacientes sin próxima cita.
- **Entregable:** el doctor agenda un tratamiento completo en menos de un minuto y el historial queda registrado.

### Fase 2 — Portal del paciente y notificaciones (3 semanas)
- Disponibilidad pública y reserva online.
- Enlaces firmados de confirmar / cancelar / reprogramar.
- **Motor de notificaciones**: eventos, reglas, cola con reintentos, recálculo al mover citas, plantillas con variables.
- Canales: correo + push para el personal; WhatsApp transaccional en cuanto esté aprobada la cuenta.
- Avisos de reprogramación, cuenta regresiva (7 d / 48 h / 24 h / 2 h) y bandeja de respuestas para recepción.
- Notificaciones internas (confirmó, canceló, sin respuesta).
- **Entregable:** reducción medible de no-shows y cero llamadas manuales para confirmar.

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
- Mensualidades ligadas a planes, fotos comparativas antes/después, odontograma (opcional).
- Aceptación de presupuesto con firma digital y cobro automático por sesión/mensualidad.
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
| Series de citas mal generadas (feriados, zonas horarias, cambios de horario) | Vista previa obligatoria, calendario de feriados por país, generación en la zona del consultorio y pruebas de casos borde. |
| Pérdida o alteración de la historia clínica | Notas firmadas inmutables, adendas, auditoría, respaldos y exportación en PDF. |
| Zonas horarias / horario de verano | Guardar en UTC, mostrar en zona del consultorio. |
| Recordatorios duplicados, tardíos o de citas ya movidas | Cola idempotente (`dedupe_key`), recálculo/cancelación al reprogramar, pruebas con reloj simulado. |
| Suplantación al confirmar/cancelar por enlace | Tokens firmados, de un solo uso, con vencimiento; validar contra el teléfono del paciente. |
| Pacientes molestos por exceso de mensajes | Horario de silencio, tope de mensajes por paciente/día, opt-out fácil. |
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
11. **Historia clínica:** ¿qué formato usa hoy el doctor (odontograma, hoja de evolución, SOAP libre)? ¿Hay que importar historiales en papel o PDF?
12. **Series de citas:** ¿los patrones suelen ser semanales (ej. "cada sábado") o variables (ej. controles cada 4–6 semanas)? ¿Se agenda todo el tratamiento al inicio o por tandas?
13. **Planes:** ¿el paciente debe firmar la aceptación del presupuesto? ¿El cobro es por sesión, por fase o mensualidad fija?
14. ¿Habrá **varios doctores** que atiendan a un mismo paciente (ej. ortodoncista + endodoncista) y compartan historia, o cada uno tiene la suya?
15. **Notificaciones:** ¿con cuánta anticipación quieren recordar (ej. 48 h y 2 h)? ¿Qué pasa si el paciente no confirma: se libera el espacio o solo se avisa a recepción?
16. ¿El paciente puede **reprogramar solo** o debe aprobarlo recepción? ¿Hay límite de reprogramaciones o penalización por cancelar tarde?
17. ¿Qué canales usan más sus pacientes: WhatsApp, SMS, correo, llamada? ¿Hay pacientes sin WhatsApp (adultos mayores, menores con tutor)?

---

## 11. Próximos pasos inmediatos

- [ ] Responder las preguntas abiertas (sección 10).
- [ ] Confirmar el stack (sección 5) o proponer cambios.
- [ ] Pasarme el primer prompt de **Claude Design** (sugerencia: *agenda semanal* y *ficha de paciente*).
- [ ] Yo inicializo la **Fase 0** (repo, CI, auth, esquema base con RLS).
