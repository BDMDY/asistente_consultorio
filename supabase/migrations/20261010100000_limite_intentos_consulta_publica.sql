-- Límite de intentos fallidos en las consultas públicas (portal de clientes y consulta de citas):
-- por DNI (no se puede evadir) y por IP del visitante. Bloquea 15 minutos al pasar el límite.
create table if not exists private.public_attempts (
  id bigserial primary key,
  key text not null,
  at timestamptz not null default now()
);
create index if not exists public_attempts_key_at on private.public_attempts (key, at desc);
revoke all on private.public_attempts from public, anon, authenticated;

create or replace function private.client_ip() returns text
language sql stable set search_path = '' as $$
  select coalesce(
    nullif(h ->> 'cf-connecting-ip', ''),
    nullif(h ->> 'x-real-ip', ''),
    nullif(trim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'sin-ip')
  from (select coalesce(nullif(current_setting('request.headers', true), '')::json, '{}'::json) h) x
$$;

-- Lanza 'rate_limited' si el DNI o la IP acumulan demasiados intentos fallidos en 15 minutos.
create or replace function private.portal_guard(p_dni text) returns void
language plpgsql security definer set search_path = '' as $$
declare ip text := private.client_ip();
begin
  if (select count(*) from private.public_attempts where key = 'dni:' || p_dni and at > now() - interval '15 minutes') >= 8
     or (select count(*) from private.public_attempts where key = 'ip:' || ip and at > now() - interval '15 minutes') >= 25 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end $$;

create or replace function private.portal_fail(p_dni text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.public_attempts(key) values ('dni:' || p_dni), ('ip:' || private.client_ip());
  -- limpieza oportunista de lo antiguo
  if random() < 0.05 then delete from private.public_attempts where at < now() - interval '1 day'; end if;
end $$;
revoke all on function private.portal_guard(text), private.portal_fail(text), private.client_ip() from public, anon, authenticated;

create or replace function public.public_portal(p_slug text, p_dni text, p_phone text, p_birth text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  c uuid; ph text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  pid bigint; pname text; fnac text; verified boolean := false;
  appts jsonb; ids bigint[]; pays jsonb; notes jsonb := '[]'::jsonb; plan jsonb := '[]'::jsonb;
begin
  if coalesce(p_dni, '') !~ '^\d{8}$' or char_length(ph) < 9 then return null; end if;
  perform private.portal_guard(p_dni);
  select id into c from public.clinics where slug = p_slug;
  if c is null then return null; end if;

  select p.id, p.name into pid, pname from public.patients p
   where p.clinic_id = c and p.dni = p_dni and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 9) = ph limit 1;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.date desc, x.slot desc), '[]'::jsonb), coalesce(array_agg(x.id), '{}')
    into appts, ids
    from (select a.id, a.public_token as ref, a.date, a.slot::int, a.dur::int, a.service, a.status, a.doctor_id, a.patient_name
            from public.appointments a
           where a.clinic_id = c
             and ((a.dni = p_dni and right(regexp_replace(coalesce(a.phone, ''), '\D', '', 'g'), 9) = ph)
               -- citas que la clínica agendó sin DNI: se unen por el nombre de la ficha ya verificada
               or (pid is not null and coalesce(a.dni, '') = '' and lower(a.patient_name) = lower(pname)))
           order by a.date desc, a.slot desc limit 300) x;

  if pid is null and jsonb_array_length(appts) = 0 then perform private.portal_fail(p_dni); return null; end if;
  if pname is null then pname := appts -> 0 ->> 'patient_name'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'no', y.no, 'appt_id', y.appt_id, 'concept', y.concept, 'amount', y.amount, 'method', y.method, 'at', y.at) order by y.at desc), '[]'::jsonb)
    into pays
    from public.payments y
   where y.clinic_id = c and not y.voided and ((pid is not null and y.patient_id = pid) or y.appt_id = any(ids));

  if pid is not null then
    select r.value -> 'v' ->> 'fnac' into fnac from public.patient_records r where r.clinic_id = c and r.patient_id = pid and r.kind = 'anamnesis';
    verified := coalesce(fnac, '') <> '' and p_birth is not null and p_birth = fnac;
    if coalesce(p_birth, '') <> '' and not verified then perform private.portal_fail(p_dni); end if;
    if verified then
      select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'date', n.date, 'text', n.text, 'created_at', n.created_at) order by n.date desc, n.id desc), '[]'::jsonb)
        into notes from public.clinical_notes n where n.clinic_id = c and n.patient_id = pid;
      select coalesce(r.value -> 'items', '[]'::jsonb) into plan from public.patient_records r where r.clinic_id = c and r.patient_id = pid and r.kind = 'plan';
    end if;
  end if;

  return jsonb_build_object('name', pname, 'verified', verified, 'hasBirth', coalesce(fnac, '') <> '', 'appts', appts, 'payments', pays, 'notes', notes, 'plan', plan);
end $$;

revoke all on function public.public_portal(text, text, text, text) from public;
grant execute on function public.public_portal(text, text, text, text) to anon, authenticated;

create or replace function public.public_lookup(p_slug text, p_dni text, p_phone text)
returns table (token uuid, date date, slot integer, dur integer, service text, status text, doctor_id integer)
language plpgsql volatile security definer set search_path = '' as $$
declare c uuid; ph text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if coalesce(p_dni, '') !~ '^\d{8}$' or char_length(ph) < 9 then return; end if;
  perform private.portal_guard(p_dni);
  select id into c from public.clinics where slug = p_slug;
  if c is null then return; end if;
  return query
    select a.public_token, a.date, a.slot::int, a.dur::int, a.service, a.status, a.doctor_id
      from public.appointments a
     where a.clinic_id = c and a.dni = p_dni
       and right(regexp_replace(coalesce(a.phone, ''), '\D', '', 'g'), 9) = right(ph, 9)
       and a.date >= private.lima_today() - 30
       and a.status <> 'cancelada'
     order by a.date, a.slot
     limit 20;
  if not found then perform private.portal_fail(p_dni); end if;
end $$;
