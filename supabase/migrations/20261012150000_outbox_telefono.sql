-- Celular del destinatario en la cola de mensajes (para abrir el chat de WhatsApp o enviar con la API).
alter table public.outbox add column if not exists phone text;
