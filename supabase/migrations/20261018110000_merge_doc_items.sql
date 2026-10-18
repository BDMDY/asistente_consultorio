-- Guardado por elemento de las listas del documento de módulos (inventario, cobros, planes, campañas, sedes, descuentos…):
-- dos personas que editan la MISMA lista a la vez ya no se pisan; solo se aplican los elementos que cada una cambió.
create or replace function public.merge_doc_items(p_clinic uuid, p_key text, p_path text[], p_upsert jsonb, p_remove jsonb)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  doc jsonb; cur jsonb; ups jsonb := coalesce(p_upsert, '[]'::jsonb); rem text[]; upids text[]; merged jsonb;
begin
  if array_length(p_path, 1) is null or array_length(p_path, 1) > 2 then raise exception 'ruta no válida'; end if;
  insert into public.clinic_docs (clinic_id, key, value) values (p_clinic, p_key, '{}'::jsonb) on conflict (clinic_id, key) do nothing;
  select value into doc from public.clinic_docs where clinic_id = p_clinic and key = p_key for update;
  if doc is null then raise exception 'sin permiso' using errcode = '42501'; end if;
  if array_length(p_path, 1) = 2 then
    doc := jsonb_set(doc, array[p_path[1]], coalesce(doc -> p_path[1], '{}'::jsonb), true);
  end if;
  cur := coalesce(doc #> p_path, '[]'::jsonb);
  select coalesce(array_agg(x), '{}') into rem from jsonb_array_elements_text(coalesce(p_remove, '[]'::jsonb)) x;
  select coalesce(array_agg(e ->> 'id'), '{}') into upids from jsonb_array_elements(ups) e;
  -- lo que ya existe se reemplaza en su lugar (o se quita); lo nuevo va al principio, en el orden recibido
  select coalesce(jsonb_agg(item order by grp, ord), '[]'::jsonb) into merged from (
    select 1 as grp, t.ord, coalesce((select u from jsonb_array_elements(ups) u where u ->> 'id' = t.e ->> 'id' limit 1), t.e) as item
      from jsonb_array_elements(cur) with ordinality t(e, ord)
     where not (t.e ->> 'id' = any(rem))
    union all
    select 0, u.ord, u.e from jsonb_array_elements(ups) with ordinality u(e, ord)
     where not exists (select 1 from jsonb_array_elements(cur) c where c ->> 'id' = u.e ->> 'id')
  ) s;
  update public.clinic_docs set value = jsonb_set(doc, p_path, merged, true) where clinic_id = p_clinic and key = p_key;
end $$;
revoke all on function public.merge_doc_items(uuid, text, text[], jsonb, jsonb) from public, anon;
grant execute on function public.merge_doc_items(uuid, text, text[], jsonb, jsonb) to authenticated;
