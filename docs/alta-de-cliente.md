# Alta de un cliente nuevo

Modelo: **un proyecto de Supabase y uno de Vercel por cliente** (mismo repositorio, mismo código). La marca, los datos y las claves de cada cliente viven en su propio proyecto.

## 0. Datos previos
- Nombre real de la clínica y su **identificador**: minúsculas, sin tildes ni espacios, con guiones (ej. `dental-mavila`). Una vez creado no se cambia: da nombre a la carpeta de respaldo.
- Dominio, correo del administrador y un **código de configuración** propio de este cliente (largo, de un solo uso).
- Una **frase de cifrado** nueva para sus respaldos (`BACKUP_PASSPHRASE`), distinta de la de otros clientes. Guardarla aparte: sin ella las copias no se abren.

## 1. Supabase
1. Crear el proyecto (región `sa-east-1`). Guardar la contraseña de la base. Para producción usar plan **Pro** (el Free se pausa tras una semana sin actividad y no tiene respaldos propios).
2. **Esquema:** aplicar todos los archivos de `supabase/migrations/` **en orden de nombre** (con la CLI: `supabase link --project-ref <REF>` y `supabase db push`; o pegándolos en el SQL Editor uno por uno). Incluye la copia automática (`20261023100000_copia_automatica.sql`) y el bucket de medios.
   - Ensayar primero en un proyecto de prueba: es la forma de comprobar que las migraciones se reproducen desde cero.
3. **Authentication:**
   - URL Configuration: *Site URL* `https://www.<dominio>`; *Redirect URLs*: `/intranet`, `/intranet/nueva-clave` e `/intranet/registro` de ese dominio.
   - Passwords: mínimo 8 caracteres con mayúscula, minúscula, número y símbolo; activar protección de contraseñas filtradas (Pro).
   - Correo propio (SMTP, por ejemplo Resend con el dominio del cliente) para poder invitar a cualquier correo; traducir las plantillas al español.
4. **Funciones** (`supabase functions deploy <nombre>`): `invite-staff`, `redeem-staff-code` (con `--no-verify-jwt`) y `backup-b2` (con `--no-verify-jwt`). `send-push` y `send-whatsapp` solo cuando se activen.
5. **Secretos** (Edge Functions → Secrets): `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET`, `B2_ENDPOINT`, `BACKUP_PASSPHRASE`. Nunca en el chat ni en el repositorio.
6. **Copia automática:** ejecutar `supabase/setup/programar-copia.sql` (cambiando `<REF>`), llamar a la función una vez a mano y comprobar en la app: Configuración → Respaldo → Copia automática diaria = *Activa*.

## 2. Backblaze B2 (copias)
- Un bucket privado con cifrado del lado del servidor; regla de ciclo de vida de 30 días (ocultar a los 30, borrar al día siguiente).
- Una **clave de aplicación por cliente**, limitada al bucket, con lectura y escritura. La función guarda en la carpeta con el identificador de la clínica.

## 3. Vercel
1. Nuevo proyecto desde el mismo repositorio.
2. Variables de entorno (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLINIC_SLUG` (el identificador), `NEXT_PUBLIC_SITE_URL` (`https://www.<dominio>`); y para notificaciones push `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
3. Dominio: agregar `www.<dominio>` como principal y el dominio sin `www` con redirección 308 hacia él. Publicar de nuevo después de cambiar variables.

## 4. Primer acceso
1. Cargar el código de configuración con `supabase/setup/codigo-de-configuracion.sql`.
2. La persona del cliente entra a `/intranet/registro`, crea su cuenta y, con el código, crea la clínica y queda como administrador.
3. Cargar el contenido real: Marca y Medios (favicon 512 × 512 px, logos, portada, preguntas frecuentes, equipo, instalaciones), Servicios, Horario y Usuarios.

## 5. Verificación final
- [ ] El sitio público muestra el nombre y los colores del cliente (sin datos de otro).
- [ ] Reserva web, consulta en «Clientes» y enlace «Mi cita».
- [ ] Invitar a un usuario (correo) y registro con código de acceso.
- [ ] Un cobro con comprobante; descarga de respaldo manual abierta con `scripts/descifrar-respaldo.mjs`.
- [ ] Copia automática: archivo en B2 en la carpeta del cliente y estado *Activa* en la app.
- [ ] `/robots.txt` y `/sitemap.xml` con el dominio del cliente.

## Operación continua
- **Actualizaciones de código:** llegan a todos los proyectos de Vercel conectados a la misma rama. Conviene una rama estable de producción (`main`) y probar primero en un cliente piloto.
- **Migraciones nuevas:** hay que aplicarlas en **cada** proyecto de Supabase. Mantener una lista de clientes con: nombre, identificador, proyecto de Supabase, proyecto de Vercel, dominio y fecha de alta.
- **Costos por cliente:** Supabase Pro por proyecto, dominio, correo (Resend) y Backblaze (casi nulo). Verificar precios vigentes.
