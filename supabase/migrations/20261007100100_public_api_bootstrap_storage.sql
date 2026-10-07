-- DentAssist · API pública (reserva y "Mi cita"), alta del primer administrador, vinculación del personal y almacenamiento.

-- ───────────── Ayudantes internos ─────────────
create function private.new_id() returns bigint language sql volatile set search_path = '' as $$
  select (extract(epoch from clock_timestamp()) * 1000000)::bigint
$$;

create function private.clinic_doctors(c uuid) returns int[]
language plpgsql stable security definer set search_path = '' as $$
declare v int[];
begin
  select array(select (e ->> 'id')::int from jsonb_array_elements(d.value -> 'docs') e)
    into v from public.clinic_docs d
   where d.clinic_id = c and d.key = 'media' and jsonb_typeof(d.value -> 'docs') = 'array';
  if v is null or cardinality(v) = 0 then return array[1, 2, 3]; end if;
  return v;
end $$;

create function private.service_ok(c uuid, p_service text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare arr jsonb;
begin
  select d.value -> 'services' into arr from public.clinic_docs d
   where d.clinic_id = c and d.key = 'media' and jsonb_typeof(d.value -> 'services') = 'array';
  if arr is null or jsonb_array_length(arr) = 0 then return true; end if;
  return exists (
    select 1 from jsonb_array_elements(arr) s
     where s ->> 'name' = p_service and coalesce((s ->> 'on')::boolean, true)
  );
end $$;

create function private.lima_today() returns date language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Lima')::date
$$;

-- ───────────── Sitio público: marca y medios ─────────────
create function public.public_site(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'clinic', jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug),
    'brand', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'brand'),
    'media', (select d.value from public.clinic_docs d where d.clinic_id = c.id and d.key = 'media')
  )
  from public.clinics c where c.slug = p_slug
$$;

-- Horarios ocupados (sin datos de pacientes) para calcular disponibilidad en la reserva.
create function public.public_busy(p_slug text, p_from date, p_to date)
returns table (date date, doctor_id integer, slot integer, dur integer)
language sql stable security definer set search_path = '' as $$
  select a.date, a.doctor_id, a.slot::int, a.dur::int
    from public.appointments a join public.clinics c on c.id = a.clinic_id
   where c.slug = p_slug and a.status <> 'cancelada'
     and a.date between p_from and least(p_to, p_from + 62)
$$;

-- ───────────── Reserva pública ─────────────
create function public.public_book(
  p_slug text, p_doctor integer, p_date date, p_slot integer, p_dur integer,
  p_service text, p_name text, p_dni text, p_phone text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c uuid; docs int[]; doc int; pid bigint; aid bigint; tok uuid;
  today date := private.lima_today(); tries int := 0;
  nm text := btrim(coalesce(p_name, '')); ph text := btrim(coalesce(p_phone, ''));
begin
  select id into c from public.clinics where slug = p_slug;
  if c is null then raise exception 'clinic_not_found' using errcode = 'P0001'; end if;
  if char_length(nm) < 5 or char_length(nm) > 120 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if coalesce(p_dni, '') !~ '^\d{8}$' then raise exception 'invalid_dni' using errcode = 'P0001'; end if;
  if regexp_replace(ph, '\D', '', 'g') !~ '^\d{9,15}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if p_date is null or p_date < today or p_date > today + 60 or extract(dow from p_date) = 0 then raise exception 'invalid_date' using errcode = 'P0001'; end if;
  if p_slot is null or p_dur is null or p_slot < 0 or p_slot > 31 or p_dur < 1 or p_dur > 8 or p_slot + p_dur > 32 then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
  if char_length(coalesce(p_service, '')) not between 1 and 120 or not private.service_ok(c, p_service) then raise exception 'invalid_service' using errcode = 'P0001'; end if;
  if (select count(*) from public.appointments a
       where a.clinic_id = c and a.dni = p_dni and a.web and a.date >= today
         and a.status in ('pendiente', 'confirmada', 'reprogramada')) >= 3 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;

  docs := private.clinic_doctors(c);
  if p_doctor is null then
    select d into doc from unnest(docs) d
     where not exists (
       select 1 from public.appointments a
        where a.clinic_id = c and a.doctor_id = d and a.date = p_date and a.status <> 'cancelada'
          and int4range(a.slot::int, (a.slot + a.dur)::int) && int4range(p_slot, p_slot + p_dur))
     limit 1;
    if doc is null then raise exception 'slot_taken' using errcode = 'P0001'; end if;
  elsif p_doctor = any (docs) then
    doc := p_doctor;
  else
    raise exception 'invalid_doctor' using errcode = 'P0001';
  end if;

  select id into pid from public.patients where clinic_id = c and dni = p_dni limit 1;
  if pid is null then
    pid := private.new_id();
    insert into public.patients (clinic_id, id, name, dni, phone, web) values (c, pid, nm, p_dni, ph, true);
  end if;

  loop
    aid := private.new_id() + tries;
    begin
      insert into public.appointments (clinic_id, id, date, doctor_id, slot, dur, patient_name, service, status, web, dni, phone)
      values (c, aid, p_date, doc, p_slot, p_dur, nm, p_service, 'pendiente', true, p_dni, ph)
      returning public_token into tok;
      exit;
    exception
      when exclusion_violation then raise exception 'slot_taken' using errcode = 'P0001';
      when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('id', aid, 'token', tok, 'doctor_id', doc, 'date', p_date, 'slot', p_slot);
end $$;

-- ───────────── "Mi cita" con enlace único ─────────────
create function public.public_appointment(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'patient', a.patient_name, 'service', a.service, 'date', a.date, 'slot', a.slot, 'dur', a.dur,
    'status', a.status, 'doctor_id', a.doctor_id, 'clinic', jsonb_build_object('name', c.name, 'slug', c.slug))
  from public.appointments a join public.clinics c on c.id = a.clinic_id
  where a.public_token = p_token
$$;

create function public.public_appointment_action(
  p_token uuid, p_action text, p_date date default null, p_slot integer default null, p_doctor integer default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.appointments; today date := private.lima_today(); docs int[]; doc int;
begin
  select * into a from public.appointments where public_token = p_token for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  if a.status in ('cancelada', 'atendida', 'no-show') then raise exception 'closed' using errcode = 'P0001'; end if;
  if a.date < today then raise exception 'expired' using errcode = 'P0001'; end if;

  if p_action = 'confirm' then
    update public.appointments set status = 'confirmada' where clinic_id = a.clinic_id and id = a.id and status in ('pendiente', 'reprogramada');
  elsif p_action = 'cancel' then
    update public.appointments set status = 'cancelada' where clinic_id = a.clinic_id and id = a.id;
  elsif p_action = 'reschedule' then
    docs := private.clinic_doctors(a.clinic_id);
    doc := coalesce(p_doctor, a.doctor_id);
    if not doc = any (docs) then raise exception 'invalid_doctor' using errcode = 'P0001'; end if;
    if p_date is null or p_date < today or p_date > today + 60 or extract(dow from p_date) = 0 then raise exception 'invalid_date' using errcode = 'P0001'; end if;
    if p_slot is null or p_slot < 0 or p_slot > 31 or p_slot + a.dur > 32 then raise exception 'invalid_slot' using errcode = 'P0001'; end if;
    begin
      update public.appointments set date = p_date, slot = p_slot, doctor_id = doc, status = 'reprogramada' where clinic_id = a.clinic_id and id = a.id;
    exception when exclusion_violation then raise exception 'slot_taken' using errcode = 'P0001';
    end;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
  return public.public_appointment(p_token);
end $$;

-- ───────────── Alta del primer administrador (código de un solo uso) ─────────────
create table private.bootstrap_codes (code_hash text primary key, used_at timestamptz);

create function public.bootstrap_clinic(p_code text, p_slug text, p_name text, p_nom text, p_dni text, p_tel text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c uuid; em text; h text := encode(extensions.digest(coalesce(p_code, ''), 'sha256'), 'hex');
begin
  if (select auth.uid()) is null then raise exception 'not_authenticated' using errcode = 'P0001'; end if;
  if exists (select 1 from public.clinics) then raise exception 'already_initialized' using errcode = 'P0001'; end if;
  update private.bootstrap_codes set used_at = now() where code_hash = h and used_at is null;
  if not found then raise exception 'invalid_code' using errcode = 'P0001'; end if;
  select email into em from auth.users where id = (select auth.uid());
  insert into public.clinics (slug, name) values (p_slug, p_name) returning id into c;
  insert into public.staff (clinic_id, user_id, nom, dni, cmp, mail, tel, rol)
  values (c, (select auth.uid()), p_nom, p_dni, '', em, coalesce(p_tel, ''), 'Administrador');
  return c;
end $$;

-- Al confirmar su correo, la persona invitada queda vinculada a su ficha de personal.
create function private.link_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null then
    update public.staff set user_id = new.id
     where lower(mail) = lower(new.email) and user_id is null and active;
  end if;
  return new;
end $$;
create trigger link_staff_on_insert after insert on auth.users for each row execute function private.link_staff();
create trigger link_staff_on_confirm after update of email_confirmed_at on auth.users for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function private.link_staff();

-- ───────────── Permisos de las funciones públicas ─────────────
revoke all on function public.public_site(text) from public;
revoke all on function public.public_busy(text, date, date) from public;
revoke all on function public.public_book(text, integer, date, integer, integer, text, text, text, text) from public;
revoke all on function public.public_appointment(uuid) from public;
revoke all on function public.public_appointment_action(uuid, text, date, integer, integer) from public;
revoke all on function public.bootstrap_clinic(text, text, text, text, text, text) from public;
grant execute on function public.public_site(text) to anon, authenticated;
grant execute on function public.public_busy(text, date, date) to anon, authenticated;
grant execute on function public.public_book(text, integer, date, integer, integer, text, text, text, text) to anon, authenticated;
grant execute on function public.public_appointment(uuid) to anon, authenticated;
grant execute on function public.public_appointment_action(uuid, text, date, integer, integer) to anon, authenticated;
grant execute on function public.bootstrap_clinic(text, text, text, text, text, text) to authenticated;

-- ───────────── Almacenamiento ─────────────
create function private.is_admin_txt(c text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()) and s.active and s.rol = 'Administrador' and s.clinic_id::text = c)
$$;
create function private.is_member_txt(c text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()) and s.active and s.clinic_id::text = c)
$$;
revoke all on function private.is_admin_txt(text) from public;
revoke all on function private.is_member_txt(text) from public;
grant execute on function private.is_admin_txt(text) to authenticated;
grant execute on function private.is_member_txt(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('clinic-media', 'clinic-media', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('patient-files', 'patient-files', false, 15728640, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "clinic media: admin escribe" on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-media' and private.is_admin_txt((storage.foldername(name))[1]));
create policy "clinic media: admin actualiza" on storage.objects for update to authenticated
  using (bucket_id = 'clinic-media' and private.is_admin_txt((storage.foldername(name))[1]))
  with check (bucket_id = 'clinic-media' and private.is_admin_txt((storage.foldername(name))[1]));
create policy "clinic media: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'clinic-media' and private.is_admin_txt((storage.foldername(name))[1]));

create policy "patient files: personal lee" on storage.objects for select to authenticated
  using (bucket_id = 'patient-files' and private.is_member_txt((storage.foldername(name))[1]));
create policy "patient files: personal sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'patient-files' and private.is_member_txt((storage.foldername(name))[1]));
create policy "patient files: personal borra" on storage.objects for delete to authenticated
  using (bucket_id = 'patient-files' and private.is_member_txt((storage.foldername(name))[1]));
