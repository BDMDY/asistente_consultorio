-- Solo el administrador puede eliminar citas (el resto del personal las cancela).
alter policy appointments_delete on public.appointments using (private.is_admin(clinic_id));
