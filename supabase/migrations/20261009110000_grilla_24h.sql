-- La agenda pasa a cubrir 24 h: 96 tramos de 15 min, 0 = 00:00 (antes 0 = 09:00). Las citas existentes se desplazan +36 tramos.

-- 1) Horario por defecto (09:00–17:00 = tramos 36–68) y formato nuevo del horario guardado (v = 2).
create or replace function private.day_window(c uuid, d date) returns int4range
language plpgsql stable security definer set search_path = '' as $$
declare sch jsonb; day jsonb;
begin
  select value -> 'schedule' into sch from public.clinic_docs where clinic_id = c and key = 'brand';
  if sch is null or jsonb_typeof(sch) <> 'object' or (sch ->> 'v') is distinct from '2' then
    if extract(dow from d) = 0 then return null; end if;
    return int4range(36, 68);
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(sch -> 'closures', '[]'::jsonb)) x where x ->> 'date' = d::text) then return null; end if;
  day := sch -> 'days' -> (extract(dow from d)::int);
  if day is null or not coalesce((day ->> 'open')::boolean, false) then return null; end if;
  return int4range(greatest(0, (day ->> 'from')::int), least(96, (day ->> 'to')::int));
end $$;

-- 2) Límites de la grilla.
do $$ begin
  execute 'alter table public.appointments drop constraint appointments_check';
  execute 'alter table public.appointments drop constraint appointments_dur_check';
  execute 'alter table public.appointments drop constraint appointments_slot_check';
  execute 'alter table public.appointments add constraint appointments_slot_check check (slot between 0 and 95)';
  execute 'alter table public.appointments add constraint appointments_dur_check check (dur between 1 and 96)';
  execute 'alter table public.appointments add constraint appointments_check check (slot + dur <= 96)';
end $$;

-- 3) Citas existentes: desplazar al nuevo origen (se evita el control de horario durante el traslado).
alter table public.appointments disable trigger appointments_guard_hours;
update public.appointments set slot = slot + 36;
alter table public.appointments enable trigger appointments_guard_hours;

-- 4) Funciones públicas: nuevos límites de tramo.
do $$ declare d text; begin
  select pg_get_functiondef('public.public_book(text,integer,date,integer,integer,text,text,text,text,text)'::regprocedure) into d;
  d := replace(replace(d, 'p_slot > 31', 'p_slot > 95'), 'p_slot + p_dur > 32', 'p_slot + p_dur > 96');
  execute d;
  select pg_get_functiondef('public.public_appointment_action(uuid,text,date,integer,integer)'::regprocedure) into d;
  d := replace(replace(d, 'p_slot > 31', 'p_slot > 95'), 'p_slot + a.dur > 32', 'p_slot + a.dur > 96');
  execute d;
end $$;
