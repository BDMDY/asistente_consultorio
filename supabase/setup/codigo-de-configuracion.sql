-- Código de configuración de un cliente nuevo: lo escribe la persona del cliente en «Configura tu clínica» (/intranet/registro)
-- para crear la clínica y quedar como administrador. Elige un código largo y propio de ese cliente; vale una sola vez.
-- Reemplaza TU-CODIGO-AQUI y ejecútalo en el SQL Editor del proyecto del cliente.
insert into private.bootstrap_codes (code_hash)
values (encode(extensions.digest('TU-CODIGO-AQUI', 'sha256'), 'hex'));
