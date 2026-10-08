-- La reserva pública identifica al paciente por DNI: si ya existe usa su ficha y su nombre registrado,
-- si no, lo registra. Acepta un correo opcional (completa el de la ficha solo si faltaba).
alter function public.public_book(text, integer, date, integer, integer, text, text, text, text) set schema private;
alter function private.public_book(text, integer, date, integer, integer, text, text, text, text) rename to public_book_v1;

create function public.public_book(
  p_slug text, p_doctor integer, p_date date, p_slot integer, p_dur integer,
  p_service text, p_name text, p_dni text, p_phone text, p_email text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c uuid; docs int[]; doc int; pid bigint; aid bigint; tok uuid; pname text; existing boolean := false;
  today date := private.lima_today(); tries int := 0;
  nm text := btrim(coalesce(p_name, '')); ph text := btrim(coalesce(p_phone, '')); em text := nullif(btrim(coalesce(p_email, '')), '');
begin
  select id into c from public.clinics where slug = p_slug;
  if c is null then raise exception 'clinic_not_found' using errcode = 'P0001'; end if;
  if char_length(nm) < 5 or char_length(nm) > 120 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if coalesce(p_dni, '') !~ '^\d{8}$' then raise exception 'invalid_dni' using errcode = 'P0001'; end if;
  if regexp_replace(ph, '\D', '', 'g') !~ '^\d{9,15}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if em is not null and (em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(em) > 160) then raise exception 'invalid_email' using errcode = 'P0001'; end if;
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

  select id, name into pid, pname from public.patients where clinic_id = c and dni = p_dni order by created_at limit 1;
  if pid is not null then
    existing := true;
    if em is not null then
      update public.patients set email = em where clinic_id = c and id = pid and coalesce(email, '') = '';
    end if;
  else
    pid := private.new_id();
    pname := nm;
    insert into public.patients (clinic_id, id, name, dni, phone, email, web) values (c, pid, nm, p_dni, ph, em, true);
  end if;

  loop
    aid := private.new_id() + tries;
    begin
      insert into public.appointments (clinic_id, id, date, doctor_id, slot, dur, patient_name, service, status, web, dni, phone)
      values (c, aid, p_date, doc, p_slot, p_dur, pname, p_service, 'pendiente', true, p_dni, ph)
      returning public_token into tok;
      exit;
    exception
      when exclusion_violation then raise exception 'slot_taken' using errcode = 'P0001';
      when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise; end if;
    end;
  end loop;
  return jsonb_build_object('id', aid, 'token', tok, 'doctor_id', doc, 'date', p_date, 'slot', p_slot, 'existing', existing, 'patient', pname);
end $$;
revoke all on function public.public_book(text, integer, date, integer, integer, text, text, text, text, text) from public;
grant execute on function public.public_book(text, integer, date, integer, integer, text, text, text, text, text) to anon, authenticated;
