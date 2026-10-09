-- Portal de clientes: historial de citas, comprobantes y (verificado con la fecha de nacimiento) diagnósticos y tratamientos.
-- Exige DNI + teléfono que coincidan; los datos clínicos solo salen si además coincide la fecha de nacimiento de la historia inicial.
create or replace function public.public_portal(p_slug text, p_dni text, p_phone text, p_birth text default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c uuid; ph text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 9);
  pid bigint; pname text; fnac text; verified boolean := false;
  appts jsonb; ids bigint[]; pays jsonb; notes jsonb := '[]'::jsonb; plan jsonb := '[]'::jsonb;
begin
  if coalesce(p_dni, '') !~ '^\d{8}$' or char_length(ph) < 9 then return null; end if;
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

  if pid is null and jsonb_array_length(appts) = 0 then return null; end if;
  if pname is null then pname := appts -> 0 ->> 'patient_name'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', y.id, 'no', y.no, 'appt_id', y.appt_id, 'concept', y.concept, 'amount', y.amount, 'method', y.method, 'at', y.at) order by y.at desc), '[]'::jsonb)
    into pays
    from public.payments y
   where y.clinic_id = c and not y.voided and ((pid is not null and y.patient_id = pid) or y.appt_id = any(ids));

  if pid is not null then
    select r.value -> 'v' ->> 'fnac' into fnac from public.patient_records r where r.clinic_id = c and r.patient_id = pid and r.kind = 'anamnesis';
    verified := coalesce(fnac, '') <> '' and p_birth is not null and p_birth = fnac;
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
