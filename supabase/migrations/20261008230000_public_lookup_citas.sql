-- Consulta pública de citas vigentes: exige DNI y teléfono que coincidan con los registrados en la cita.
create function public.public_lookup(p_slug text, p_dni text, p_phone text)
returns table (token uuid, date date, slot integer, dur integer, service text, status text, doctor_id integer)
language plpgsql stable security definer set search_path = '' as $$
declare c uuid; ph text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if coalesce(p_dni, '') !~ '^\d{8}$' or char_length(ph) < 9 then return; end if;
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
end $$;
revoke all on function public.public_lookup(text, text, text) from public;
grant execute on function public.public_lookup(text, text, text) to anon, authenticated;
