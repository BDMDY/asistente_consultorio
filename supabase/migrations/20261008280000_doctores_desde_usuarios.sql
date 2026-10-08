-- Los doctores de la agenda y de la reserva son los usuarios activos con perfil Doctor.
-- Cada doctor tiene un número de agenda (agenda_id) que usan las citas (appointments.doctor_id).
alter table public.staff add column agenda_id integer check (agenda_id > 0);
create unique index staff_clinic_agenda on public.staff (clinic_id, agenda_id) where agenda_id is not null;

create function private.assign_agenda() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rol = 'Doctor' and new.agenda_id is null then
    select coalesce(max(agenda_id), 0) + 1 into new.agenda_id from public.staff where clinic_id = new.clinic_id;
  end if;
  return new;
end $$;
create trigger staff_assign_agenda before insert or update of rol, agenda_id on public.staff
  for each row execute function private.assign_agenda();
update public.staff set rol = rol where rol = 'Doctor' and agenda_id is null;

create or replace function private.clinic_doctors(c uuid) returns int[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array(
    select s.agenda_id from public.staff s
     where s.clinic_id = c and s.rol = 'Doctor' and s.active and s.agenda_id is not null
     order by s.agenda_id), '{}')
$$;

create or replace function public.public_site(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'clinic', jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug),
    'brand', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'brand'),
    'media', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'media'),
    'doctors', coalesce((select jsonb_agg(jsonb_build_object('id', s.agenda_id, 'nom', s.nom, 'cmp', s.cmp) order by s.agenda_id)
                           from public.staff s where s.clinic_id = c.id and s.rol = 'Doctor' and s.active and s.agenda_id is not null), '[]'::jsonb)
  )
  from public.clinics c where c.slug = p_slug
$$;
