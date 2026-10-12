-- Un número de comprobante pertenece a una sola cita (o a un solo paciente si no hay cita): impide que dos cobros distintos
-- terminen con el mismo número aunque dos usuarios trabajen a la vez.
create or replace function private.guard_receipt_no() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from public.payments p
     where p.clinic_id = new.clinic_id and p.no = new.no and p.id <> new.id
       and (coalesce(p.appt_id, -1) <> coalesce(new.appt_id, -1)
            or (new.appt_id is null and coalesce(p.patient_id, -1) <> coalesce(new.patient_id, -1)))
  ) then
    raise exception 'receipt_no_taken' using errcode = '23505';
  end if;
  return new;
end $$;
drop trigger if exists payments_guard_receipt_no on public.payments;
create trigger payments_guard_receipt_no before insert on public.payments for each row execute function private.guard_receipt_no();
