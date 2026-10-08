-- Solo el administrador reactiva una cita cancelada (las funciones públicas no tienen sesión y ya la rechazan).
create function private.guard_reactivate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'cancelada' and new.status <> 'cancelada' and (select auth.uid()) is not null
     and not private.is_admin(old.clinic_id) then
    raise exception 'Solo el administrador puede reactivar una cita cancelada' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger appointments_guard_reactivate before update of status on public.appointments
  for each row execute function private.guard_reactivate();
