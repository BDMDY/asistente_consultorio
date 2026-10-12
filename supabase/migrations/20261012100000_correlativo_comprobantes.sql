-- Correlativo de comprobantes sin repetidos: el servidor reserva bloques de números por clínica.
create table if not exists public.receipt_counters (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  last integer not null default 123
);
alter table public.receipt_counters enable row level security;
-- sin políticas: solo se usa desde la función de abajo (security definer)

-- Reserva `p_n` números consecutivos y devuelve el primero. La primera vez parte del mayor correlativo ya usado.
create or replace function public.reserve_receipt_numbers(p_n integer default 5)
returns integer
language plpgsql security definer set search_path = '' as $$
declare c uuid; n integer := least(greatest(coalesce(p_n, 5), 1), 50); top integer; res integer;
begin
  select clinic_id into c from public.staff where user_id = (select auth.uid()) and active limit 1;
  if c is null then raise exception 'sin permiso' using errcode = '42501'; end if;
  select coalesce(max(nullif(substring(no from '(\d+)$'), '')::integer), 123) into top from public.payments where clinic_id = c;
  insert into public.receipt_counters(clinic_id, last) values (c, greatest(top, 123) + n)
  on conflict (clinic_id) do update set last = greatest(public.receipt_counters.last, greatest(top, 123)) + n
  returning last into res;
  return res - n + 1;
end $$;
revoke all on function public.reserve_receipt_numbers(integer) from public, anon;
grant execute on function public.reserve_receipt_numbers(integer) to authenticated;
