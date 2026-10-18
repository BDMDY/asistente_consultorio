-- Índice para la clave foránea de las notas clínicas (aviso de rendimiento de Supabase).
create index if not exists clinical_notes_created_by_idx on public.clinical_notes (created_by);
