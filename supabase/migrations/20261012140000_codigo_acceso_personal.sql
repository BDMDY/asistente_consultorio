-- Código de acceso para el personal: respaldo a la invitación por correo.
-- El administrador genera un código de un solo uso (vence a las 72 h); la persona se registra con correo + DNI + código.
create table if not exists private.staff_codes (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.create_staff_code(p_staff uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
  i int;
begin
  select clinic_id, user_id, active into s from public.staff where id = p_staff;
  if not found or not private.is_admin(s.clinic_id) then raise exception 'No autorizado' using errcode = '42501'; end if;
  if s.user_id is not null then raise exception 'Esta persona ya tiene acceso' using errcode = 'P0001'; end if;
  if not s.active then raise exception 'El usuario está suspendido' using errcode = 'P0001'; end if;
  for i in 0..7 loop code := code || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1); end loop;
  insert into private.staff_codes (staff_id, code_hash, expires_at)
  values (p_staff, encode(extensions.digest(code || p_staff::text, 'sha256'), 'hex'), now() + interval '72 hours')
  on conflict (staff_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, created_at = now();
  return substr(code, 1, 4) || '-' || substr(code, 5, 4);
end $$;
revoke all on function public.create_staff_code(uuid) from public, anon;
grant execute on function public.create_staff_code(uuid) to authenticated;

-- Solo la usa la función de servidor (service_role): valida correo + DNI + código. Tras 5 fallos se bloquea hasta generar otro código.
create or replace function public.check_staff_code(p_email text, p_dni text, p_code text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s record; c record; norm text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  select id, user_id, active into s from public.staff
   where lower(mail) = lower(trim(p_email)) and dni = trim(p_dni) order by active desc limit 1;
  if not found or not s.active or s.user_id is not null then return null; end if;
  select * into c from private.staff_codes where staff_id = s.id for update;
  if not found or c.expires_at < now() or c.attempts >= 5 then return null; end if;
  if c.code_hash <> encode(extensions.digest(norm || s.id::text, 'sha256'), 'hex') then
    update private.staff_codes set attempts = attempts + 1 where staff_id = s.id;
    return null;
  end if;
  return s.id;
end $$;
revoke all on function public.check_staff_code(text, text, text) from public, anon, authenticated;
grant execute on function public.check_staff_code(text, text, text) to service_role;

create or replace function public.consume_staff_code(p_staff uuid)
returns void
language sql security definer set search_path = '' as $$
  delete from private.staff_codes where staff_id = p_staff;
$$;
revoke all on function public.consume_staff_code(uuid) from public, anon, authenticated;
grant execute on function public.consume_staff_code(uuid) to service_role;
