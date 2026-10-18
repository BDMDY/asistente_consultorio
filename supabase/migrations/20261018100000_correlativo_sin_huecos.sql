-- Correlativo sin huecos: los números reservados que no se usaron vuelven a ofrecerse pasados 7 días.
create table if not exists private.receipt_reservations (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  no integer not null,
  user_id uuid,
  reserved_at timestamptz not null default now(),
  primary key (clinic_id, no)
);

-- Los números ya reservados antes de esta versión (sin pago) cuentan como reservas de hoy: no se reparten de inmediato.
insert into private.receipt_reservations (clinic_id, no)
select rc.clinic_id, n
  from public.receipt_counters rc, generate_series(124, rc.last) n
 where not exists (
   select 1 from public.payments p
    where p.clinic_id = rc.clinic_id and nullif(substring(p.no from '(\d+)$'), '')::integer = n
 )
on conflict do nothing;

-- Reserva `p_n` números: primero los huecos libres (sin pago y sin reserva vigente) y, si faltan, los siguientes del contador.
create or replace function public.reserve_receipt_numbers_v2(p_n integer default 5)
returns integer[]
language plpgsql security definer set search_path = '' as $$
declare
  c uuid; me uuid := (select auth.uid());
  n integer := least(greatest(coalesce(p_n, 5), 1), 50);
  top integer; cur integer; out integer[] := '{}'; h integer;
begin
  select clinic_id into c from public.staff where user_id = me and active limit 1;
  if c is null then raise exception 'sin permiso' using errcode = '42501'; end if;
  select coalesce(max(nullif(substring(no from '(\d+)$'), '')::integer), 123) into top from public.payments where clinic_id = c;
  insert into public.receipt_counters(clinic_id, last) values (c, greatest(top, 123)) on conflict (clinic_id) do nothing;
  select last into cur from public.receipt_counters where clinic_id = c for update;
  cur := greatest(cur, top, 123);
  for h in
    select g from generate_series(124, cur) g
     where not exists (select 1 from public.payments p where p.clinic_id = c and nullif(substring(p.no from '(\d+)$'), '')::integer = g)
       and not exists (select 1 from private.receipt_reservations r where r.clinic_id = c and r.no = g and r.reserved_at > now() - interval '7 days')
     order by g limit n
  loop
    out := out || h;
    insert into private.receipt_reservations (clinic_id, no, user_id) values (c, h, me)
    on conflict (clinic_id, no) do update set user_id = excluded.user_id, reserved_at = now();
  end loop;
  while coalesce(array_length(out, 1), 0) < n loop
    cur := cur + 1;
    out := out || cur;
    insert into private.receipt_reservations (clinic_id, no, user_id) values (c, cur, me)
    on conflict (clinic_id, no) do update set user_id = excluded.user_id, reserved_at = now();
  end loop;
  update public.receipt_counters set last = cur where clinic_id = c;
  return out;
end $$;
revoke all on function public.reserve_receipt_numbers_v2(integer) from public, anon;
grant execute on function public.reserve_receipt_numbers_v2(integer) to authenticated;

-- Devuelve al servidor los números que la sesión no llegó a usar (al cerrar sesión), para que se reutilicen de inmediato.
create or replace function public.release_receipt_numbers(p_nos integer[])
returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid; me uuid := (select auth.uid());
begin
  select clinic_id into c from public.staff where user_id = me and active limit 1;
  if c is null then return; end if;
  delete from private.receipt_reservations r
   where r.clinic_id = c and r.user_id = me and r.no = any(coalesce(p_nos, '{}'))
     and not exists (select 1 from public.payments p where p.clinic_id = c and nullif(substring(p.no from '(\d+)$'), '')::integer = r.no);
end $$;
revoke all on function public.release_receipt_numbers(integer[]) from public, anon;
grant execute on function public.release_receipt_numbers(integer[]) to authenticated;
