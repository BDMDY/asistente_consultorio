-- Cobros: anulables (no cuentan en finanzas ni reportes) y vinculados al tratamiento del plan y al paciente.
alter table public.payments add column voided boolean not null default false, add column item_id text, add column patient_id bigint;
