# Prompt 01 — Sistema de diseño, landing por empresa e intranet (Claude Design)

```
Diseña la identidad visual y las pantallas base de DentAssist, una plataforma web (SaaS) profesional para consultorios de ortodoncia, odontología y medicina. Cada consultorio ("empresa") tiene su propio sitio público (landing) con dominio propio y su propia intranet para el personal con otro dominio. Primer piloto: un solo consultorio en Lima, Perú. Idioma: español (Perú). Moneda: soles (S/). Zona horaria: America/Lima.

## 1. Estilo y marca
- Sensación: clínica moderna, confiable, limpia, cálida. Profesional, no corporativa fría ni "startup juguetona".
- Paleta base en VERDE JADE:
  - Jade principal ~ #00A86B (ajusta si mejora el contraste).
  - Escala completa de 50 a 950 (jade muy claro a casi negro verdoso).
  - Gradientes suaves de jade claro a menta/blanco para fondos de hero, tarjetas destacadas y botones principales (ej. de #E6F7EF a #FFFFFF, y de #34C58B a #00A86B).
  - Neutros cálidos o grises ligeramente verdosos para texto y bordes; fondo blanco/hueso.
  - Colores semánticos: éxito, advertencia, error, información.
  - Colores de estado de cita: pendiente, confirmada, en sala, atendida, cancelada, no-show, reprogramada.
- Tipografía: una sans moderna y legible (ej. Inter, Plus Jakarta Sans o similar) con jerarquía clara; números tabulares para horarios y montos.
- Esquinas redondeadas medias (8–16 px), sombras suaves, mucho espacio en blanco, iconografía de línea consistente.
- Accesibilidad: contraste AA mínimo, foco visible, tamaños táctiles cómodos.
- Modo claro como principal; deja listos los tokens para modo oscuro.

## 2. Personalización por empresa (white-label)
Todo el sistema debe estar pensado con tokens para que cada consultorio personalice:
- Logo (claro y oscuro) y favicon.
- Color primario (el jade es el valor por defecto; el resto de la escala se deriva automáticamente) y color de acento.
- Tipografía opcional (entre 3 combinaciones predefinidas).
- Nombre comercial, eslogan, dirección, teléfonos, WhatsApp, redes sociales, horarios.
- Fotos: hero, equipo, instalaciones, galería de casos (antes/después).
- Textos de las secciones del landing.
Diseña una pantalla de "Configuración de marca" en la intranet con vista previa en vivo del landing mientras se editan colores, logo y textos. Muestra el sistema con el jade por defecto y una variante de ejemplo en otro color (azul) para demostrar que se adapta.

## 3. Sitio público (landing) de cada empresa
Pantallas (desktop y móvil, mobile-first):
1. Hero con gradiente jade claro, titular, subtítulo, botón principal "Reservar cita" y botón secundario "WhatsApp"; foto o ilustración del consultorio.
2. Servicios (tarjetas con icono, descripción breve y "desde S/ ..." opcional).
3. Equipo / doctores (foto, nombre, especialidad, número de colegiatura).
4. Por qué elegirnos / cifras (años de experiencia, pacientes atendidos, valoraciones).
5. Galería de casos (antes/después) y testimonios.
6. Disponibilidad y reserva de cita: elegir servicio → elegir doctor (opcional) → elegir día y hora (solo huecos libres) → datos del paciente → confirmación. Debe sentirse rápida y simple en celular.
7. Ubicación con mapa, horarios, contacto, preguntas frecuentes.
8. Pie de página con logo, enlaces, redes y aviso de privacidad (Ley 29733).
9. Página "Mi cita" (se accede por enlace único, sin login): ver detalles y botones Confirmar / Reprogramar / Cancelar, con cuenta regresiva ("faltan 2 días").
Incluye botón flotante de WhatsApp y banner opcional de consentimiento de datos.

## 4. Intranet (acceso del personal)
Dominio aparte del landing. Pantallas:
1. Inicio de sesión (correo y contraseña, recuperar contraseña) con el logo de la empresa; opcional "Entrar con Google".
2. Estructura general: menú lateral colapsable con los módulos Agenda, Pacientes, Planes de tratamiento, Inventario, Finanzas, Servicios, Mensajes/Campañas, Reportes, Configuración. Barra superior con buscador global, notificaciones, selector de sede (si hay varias) y menú de usuario.
3. Dashboard del día: citas de hoy, ocupación, ingresos del día, alertas de stock bajo, pacientes sin confirmar, atajos rápidos ("Nueva cita", "Nuevo paciente").
4. Agenda semanal/diaria por doctor o por sillón, con arrastrar y soltar, colores por estado de cita, bloqueos de horario y panel lateral con detalle de la cita (confirmar, reprogramar, cancelar, cobrar). Incluye el flujo "Crear citas en serie" (ej. "5 sábados a las 10:00") con vista previa y detección de choques.
5. Ficha del paciente: datos, alertas médicas visibles, línea de tiempo de historia clínica (notas, tratamientos, archivos, pagos), plan de tratamiento con barra de avance y próximas citas.
6. Gestión de roles y usuarios (Administrador, Doctor, Asistente) y pantalla de "Configuración de marca" (ver sección 2).
Las demás pantallas (inventario, finanzas, campañas, reportes) solo como estructura/lista tipo; las detallamos en un prompt posterior.

## 5. Componentes a entregar (sistema de diseño)
Botones (primario con gradiente jade, secundario, fantasma, peligro), campos de formulario, selectores de fecha y hora, tarjetas, tablas con filtros, badges de estado, pestañas, modales y paneles laterales, toasts, estados vacíos, esqueletos de carga, avatares, calendario, línea de tiempo, barras de progreso, navegación lateral y superior.

## 6. Entrega y formato
- Tokens de diseño exportables (colores, tipografía, espaciado, radios, sombras, gradientes) pensados para Tailwind CSS y shadcn/ui, con variables CSS (ej. --brand-500) que permitan cambiar la marca por empresa.
- Maquetas para desktop (1440 px) y móvil (390 px).
- Primero propón la dirección visual (paleta, tipografía, 2 o 3 variantes de hero) y espera mi aprobación antes de diseñar el resto.
```

## Notas de uso
- Pasar este prompt a Claude Design como primera tarea; luego los prompts por módulo (agenda, ficha de paciente, inventario, finanzas, campañas).
- Dominios: un dominio público y uno de intranet por empresa (ej. `consultorio.pe` y `intranet.consultorio.pe`); en el piloto, una sola empresa.
