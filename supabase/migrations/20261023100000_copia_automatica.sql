-- Copia automática diaria: extensiones, registro de ejecuciones y clave interna del programador (guardada en Vault).
-- La programación en sí (cron) depende de la URL de cada proyecto: ver supabase/setup/programar-copia.sql.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.backup_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  ok boolean not null,
  file text,
  bytes bigint,
  counts jsonb,
  error text
);
create index if not exists backup_runs_ran_at on public.backup_runs (ran_at desc);
create index if not exists backup_runs_clinic on public.backup_runs (clinic_id);
alter table public.backup_runs enable row level security;
drop policy if exists backup_runs_select on public.backup_runs;
create policy backup_runs_select on public.backup_runs for select to authenticated
  using (
    private.is_admin(clinic_id)
    or (clinic_id is null and exists (select 1 from public.staff s where s.user_id = (select auth.uid()) and s.active and s.rol = 'Administrador'))
  );

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'backup_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'backup_secret', 'Clave interna de la copia automática');
  end if;
end $$;

create or replace function public.backup_secret_ok(p text)
returns boolean
language sql security definer set search_path = '' as $$
  select coalesce(p, '') <> '' and exists (select 1 from vault.decrypted_secrets where name = 'backup_secret' and decrypted_secret = p);
$$;
revoke all on function public.backup_secret_ok(text) from public, anon, authenticated;
grant execute on function public.backup_secret_ok(text) to service_role;
