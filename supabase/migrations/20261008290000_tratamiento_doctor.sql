-- Tratamiento del doctor (Dr./Dra.), que se muestra antes de su nombre en la agenda, la reserva y la historia clínica.
alter table public.staff add column titulo text check (titulo is null or titulo in ('Dr.', 'Dra.'));

create or replace function public.public_site(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'clinic', jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug),
    'brand', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'brand'),
    'media', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'media'),
    'doctors', coalesce((select jsonb_agg(jsonb_build_object('id', s.agenda_id, 'nom', s.nom, 'cmp', s.cmp, 'titulo', coalesce(s.titulo, '')) order by s.agenda_id)
                           from public.staff s where s.clinic_id = c.id and s.rol = 'Doctor' and s.active and s.agenda_id is not null), '[]'::jsonb)
  )
  from public.clinics c where c.slug = p_slug
$$;
