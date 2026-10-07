# DentAssist · Handoff a desarrollo

## Arquitectura
- Una empresa = un sitio público (dominio propio) + una intranet (otro dominio). Misma marca por tokens.
- Marca por empresa: bloque CSS con `--brand-50…950`, `--accent-500`, `--font-sans/--font-display`, logos claro/oscuro, favicon (ver `README.md`).
- Idioma es-PE · moneda `S/ 1,250.00` · zona horaria America/Lima · números con `font-variant-numeric: tabular-nums`.

## Mapa de pantallas
| Pantalla | Archivo |
|---|---|
| Hero, servicios, equipo, cifras, casos, reserva, ubicación, FAQ, pie, WhatsApp | DentAssist Landing |
| Reserva (5 pasos, validación) | DentAssist Reserva |
| Mi cita (enlace único), banner Ley 29733 | DentAssist Extras |
| Login, dashboard, agenda, serie, ficha, roles, marca | DentAssist Intranet |
| Agenda con drag & drop y serie | DentAssist Agenda Interactiva |
| Planes, inventario, finanzas, campañas, reportes, servicios, configuración, usuarios | DentAssist Modulos Escritorio / Modulos Movil |
| Inicio | DentAssist Inicio Escritorio / Inicio Movil |
| Pacientes y ficha | DentAssist Pacientes |
| Componentes | DentAssist Componentes |
| Logos, favicon, fotos; listas variables de doctores / instalaciones / casos (0..n, la sección se oculta si está vacía) | DentAssist Medios de Marca |

## Estados de cita
pendiente · confirmada · en-sala · atendida · cancelada · no-show · reprogramada → tokens `--st-{estado}-bg/fg` (hay variante oscura).

## Reglas de interacción
- **Reserva:** servicio → doctor (opcional, "sin preferencia" = primer hueco libre) → día/hora (solo huecos libres; domingos cerrados) → datos (nombre ≥5, DNI 8 dígitos, celular ≥9 dígitos, consentimiento obligatorio) → confirmación con enlace por WhatsApp.
- **Agenda:** pasos de 15 min, 09:00–17:00. Soltar en un hueco ocupado se rechaza con aviso. Reprogramar = siguiente día, primer hueco libre, estado `reprogramada`.
- **Citas en serie:** n repeticiones semanales; los choques se omiten y se informan; la vista previa se calcula antes de crear.
- **Mi cita:** confirmar / reprogramar / cancelar; cuenta regresiva ("faltan N días").
- **Permisos:** Administrador (todo) · Doctor (su agenda, historias, planes) · Asistente (agenda, pacientes, cobros; sin finanzas ni configuración).

## Accesibilidad
Contraste AA: botón primario `--brand-600→700` con texto blanco. Objetivos táctiles ≥ 44 px. Foco: anillo 2 px `--brand-500`. Probar cada marca nueva contra blanco antes de publicar.

## Pendiente de contenido
Logos reales, favicon y fotos (hero, equipo, instalaciones, galería) son placeholders.

## Flujo de punta a punta (prototipo)
Reserva web → crea cita `pendiente` (marca "Web") y paciente si el DNI es nuevo → aparece en Agenda (escritorio y móvil) y en Pacientes → el paciente abre "Mi cita" (enlace con `#id`) y confirma / reprograma / cancela → la agenda se actualiza. Los horarios de la reserva salen de la disponibilidad real de la agenda (sin choques; "sin preferencia" = primer doctor libre).
Claves de almacenamiento del prototipo: `da-agenda-v1`, `da-patients-v1`, `da-media-v2`, `da-brand-v1`.

## Datos compartidos (prototipo)
La marca (color, nombre, eslogan, tipografía) y los medios (logos, fotos, servicios, doctores, instalaciones, casos) se guardan en el navegador y los lee `DentAssist Landing` (sección 2c). En producción: tablas por empresa + almacenamiento de archivos; las secciones del sitio se generan desde listas 0..n y se ocultan si están vacías.

## Cambios de la ronda de correcciones
- **Marca:** la pantalla de Configuración de marca tiene selector de color libre (la escala 50–950 se deriva con `DA.derive` en `da-core.js`: 700 se oscurece hasta AA con texto blanco), color de acento, contacto (dirección, teléfonos, WhatsApp, redes, horarios), textos del landing y carga de logo claro/oscuro, favicon y foto hero. Todo se guarda en `da-brand-v1`/`da-media-v2` y lo leen Landing, Reserva, Mi cita, Agenda, Pacientes y Privacidad. En producción: generar el bloque CSS `--brand-*` en el backend al guardar.
- **Privacidad:** página `DentAssist Privacidad` (Ley 29733, derechos ARCO) enlazada desde footer, banner de consentimiento y reserva.
- **Intranet:** recuperar contraseña (3 estados), menú colapsable, buscador global, notificaciones, selector de sede y menú de usuario funcionales.
- **Móvil intranet:** ficha del paciente y configuración de marca.
- **Accesibilidad:** controles interactivos con `role="button"`, `tabIndex` y activación con Enter/Espacio (`da-core.js`); foco visible con contorno; avisos con `role="alert"`.
- **Estados:** Mi cita con esqueleto de carga, enlace no encontrado y enlace vencido; Reserva con aviso de horario ocupado por otra persona.
- **Consistencia:** servicios y doctores de Reserva, Agenda y Mi cita salen de la lista editable de Medios de marca; la reserva ofrece horarios cada 30 min calculados con la agenda. "Sin preferencia" asigna el primer doctor libre y se le informa al paciente.
- **Landing:** una sola versión de escritorio con los datos reales (interruptor para ver una marca azul de ejemplo) y mapa OpenStreetMap incrustado; el desarrollo debe geocodificar la dirección real.

## Estado final del prototipo
- **Marca global:** `da-core.js` aplica la marca (escala `--brand-*` derivada, acento), el tema claro/oscuro y el nombre comercial a todas las pantallas; el conmutador de tema se guarda en `da-theme`. En producción: servir el bloque CSS por empresa y persistir el tema por usuario.
- **Permisos:** la matriz de Usuarios y roles es editable (Doctor y Asistente); Administrador siempre tiene acceso total. Clave `da-perms-v1`.
- **Cobro:** Cobrar en la agenda registra el pago con método y número de comprobante (`da-payments-v1`), visible en Pacientes › Pagos.
- **Teclado:** las citas de la agenda son enfocables y se mueven con flechas (↑↓ 15 min, ←→ doctor); la grilla vacía se agenda con "+ Nueva cita".
- **Claves de almacenamiento:** da-agenda-v1, da-patients-v1, da-media-v2, da-brand-v1, da-users-v1, da-perms-v1, da-payments-v1, da-notes-v1, da-plans-v1, da-theme.

## Ronda de navegación, módulos y personal
- **Navegación de escritorio unificada:** Inicio, Agenda, Pacientes y Módulos comparten (`da-core.js`) una barra delgada de 64 px con botón de tres rayas fijo arriba a la izquierda, iconos de todas las secciones, campana de notificaciones y avatar. El panel desplegable lista Inicio, Agenda, Pacientes y los 7 módulos y fija abajo nombre completo, perfil, DNI y "Cerrar sesión". El modo (móvil/escritorio) se decide por el enlace de entrada.
- **Notificaciones y perfil:** campana con stock bajo, cobros pendientes y citas sin confirmar; perfil con "Cambiar contraseña" (validación ≥ 8 caracteres) y "Cerrar sesión". Inicio móvil muestra la alerta de stock.
- **Módulos funcionales** (`DentAssist Modulos Escritorio` / `Modulos Movil`, almacenamiento `da-mod-v2`): planes (servicios con montos y cuotas por sesión, descuentos), inventario (unidad de medida), finanzas (códigos y campañas de descuento, descuento manual), servicios, mensajes y campañas (audiencias por inactividad, edad, tratamientos inconclusos y citas próximas; enlaces a la web), reportes y configuración.
- **Configuración:** Marca y contacto, Usuarios, Sedes, Notificaciones, Descuentos y Roles y permisos.
- **Personal:** cada usuario guarda nombre completo, DNI (8 dígitos, único), perfil, N.º de colegiatura (solo Doctor, 4–6 dígitos), correo (único) y celular (9 dígitos, empieza con 9). Se edita, suspende o elimina; siempre queda un administrador activo. En producción: tabla `staff` ligada a la agenda por doctor.
- **Buscador de paciente** en nuevo plan: sugerencias desde 3 dígitos de DNI o parte del nombre (máx. 6).
- **Pendiente:** modo oscuro en los módulos, unificar la marca en Componentes/Extras/Medios, retirar duplicados de la maqueta Intranet.
