-- Suscripciones de notificaciones push del personal (una por dispositivo).
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_clinic on public.push_subscriptions (clinic_id);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- Cada persona gestiona solo sus propios dispositivos, y solo en su clínica.
create policy push_select on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy push_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and clinic_id in (select private.my_clinics()));
create policy push_update on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and clinic_id in (select private.my_clinics()));
create policy push_delete on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
