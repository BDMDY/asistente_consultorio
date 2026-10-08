-- Inicio y fin reales de la atención en consulta.
alter table public.appointments add column started_at timestamptz, add column ended_at timestamptz;
