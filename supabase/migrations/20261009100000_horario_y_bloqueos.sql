-- Horario de atención (brand.value.schedule) y bloqueos de agenda (status 'bloqueo').
do $$ begin
  execute 'alter table public.appointments drop constraint appointments_status_check';
  execute $c$alter table public.appointments add constraint appointments_status_check check (status in ('pendiente','confirmada','en-sala','atendida','cancelada','no-show','reprogramada','bloqueo'))$c$;
end $$;
-- Cualquier miembro del personal puede quitar un bloqueo; las citas solo las elimina el administrador.
alter policy appointments_delete on public.appointments using (private.is_admin(clinic_id) or status = 'bloqueo');

create function private.day_window(c uuid, d date) returns int4range
language plpgsql stable security definer set search_path = '' as $$
declare sch jsonb; day jsonb;
begin
  select value -> 'schedule' into sch from public.clinic_docs where clinic_id = c and key = 'brand';
  if sch is null or jsonb_typeof(sch) <> 'object' then
    if extract(dow from d) = 0 then return null; end if;
    return int4range(0, 32);
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(sch -> 'closures', '[]'::jsonb)) x where x ->> 'date' = d::text) then return null; end if;
  day := sch -> 'days' -> (extract(dow from d)::int);
  if day is null or not coalesce((day ->> 'open')::boolean, false) then return null; end if;
  return int4range(greatest(0, (day ->> 'from')::int), least(32, (day ->> 'to')::int));
end $$;

create function private.guard_hours() returns trigger
language plpgsql security definer set search_path = '' as $$
declare w int4range;
begin
  if new.status in ('bloqueo', 'cancelada') then return new; end if;
  if tg_op = 'UPDATE' and new.date = old.date and new.slot = old.slot and new.dur = old.dur and old.status <> 'cancelada' then return new; end if;
  if tg_op = 'INSERT' and exists (
    select 1 from public.appointments a
     where a.clinic_id = new.clinic_id and a.id = new.id and a.date = new.date and a.slot = new.slot and a.dur = new.dur and a.status <> 'cancelada'
  ) then return new; end if;
  w := private.day_window(new.clinic_id, new.date);
  if w is null or new.slot < lower(w) or new.slot + new.dur > upper(w) then
    raise exception 'invalid_hours' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger appointments_guard_hours before insert or update on public.appointments
  for each row execute function private.guard_hours();
