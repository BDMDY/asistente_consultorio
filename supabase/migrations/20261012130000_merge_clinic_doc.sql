-- Guardado por secciones del documento de módulos: fusiona solo las claves enviadas (con RLS del usuario)
-- para que dos personas editando secciones distintas no se pisen.
create or replace function public.merge_clinic_doc(p_clinic uuid, p_key text, p_patch jsonb)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.clinic_docs (clinic_id, key, value)
  values (p_clinic, p_key, coalesce(p_patch, '{}'::jsonb))
  on conflict (clinic_id, key) do update
    set value = public.clinic_docs.value || excluded.value;
$$;
revoke all on function public.merge_clinic_doc(uuid, text, jsonb) from public, anon;
grant execute on function public.merge_clinic_doc(uuid, text, jsonb) to authenticated;
