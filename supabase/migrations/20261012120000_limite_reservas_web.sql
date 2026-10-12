-- Protección de la reserva web: máx. 12 reservas por hora desde la misma IP y 6 por día con el mismo DNI.
-- La función original pasa a public_book_core (sin acceso público) y una envoltura la protege.
create or replace function private.book_guard(p_dni text) returns void
language plpgsql security definer set search_path = '' as $$
declare ip text := private.client_ip();
begin
  if (select count(*) from private.public_attempts where key = 'bk-ip:' || ip and at > now() - interval '1 hour') >= 12
     or (select count(*) from private.public_attempts where key = 'bk-dni:' || coalesce(p_dni, '') and at > now() - interval '1 day') >= 6 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into private.public_attempts(key) values ('bk-ip:' || ip), ('bk-dni:' || coalesce(p_dni, ''));
  if random() < 0.05 then delete from private.public_attempts where at < now() - interval '1 day'; end if;
end $$;
revoke all on function private.book_guard(text) from public, anon, authenticated;

alter function public.public_book(text,integer,date,integer,integer,text,text,text,text,text) rename to public_book_core;
revoke all on function public.public_book_core(text,integer,date,integer,integer,text,text,text,text,text) from public, anon, authenticated;

create or replace function public.public_book(p_slug text, p_doctor integer, p_date date, p_slot integer, p_dur integer, p_service text, p_name text, p_dni text, p_phone text, p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.book_guard(p_dni);
  return public.public_book_core(p_slug, p_doctor, p_date, p_slot, p_dur, p_service, p_name, p_dni, p_phone, p_email);
end $$;
revoke all on function public.public_book(text,integer,date,integer,integer,text,text,text,text,text) from public;
grant execute on function public.public_book(text,integer,date,integer,integer,text,text,text,text,text) to anon, authenticated;
