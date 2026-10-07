-- DentAssist · esquema base multiempresa
-- Toda tabla de datos lleva clinic_id y tiene seguridad por fila (RLS): solo el personal activo de la empresa accede.

create extension if not exists btree_gist with schema extensions;
create extension if not exists moddatetime with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ───────────── Empresas y personal ─────────────
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 2 and 120),
  created_at timestamptz not null default now()
);

create type public.staff_role as enum ('Administrador', 'Doctor', 'Asistente');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  nom text not null check (char_length(nom) between 2 and 120),
  dni text not null check (dni ~ '^\d{8}$'),
  cmp text not null default '',
  mail text not null check (mail ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  tel text not null default '',
  rol public.staff_role not null default 'Asistente',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, dni)
);
create unique index staff_clinic_mail on public.staff (clinic_id, lower(mail));
create unique index staff_user_clinic on public.staff (user_id, clinic_id) where user_id is not null;
create index staff_user on public.staff (user_id);
create trigger staff_touch before update on public.staff for each row execute function extensions.moddatetime(updated_at);

-- ───────────── Ayudantes de seguridad (no expuestos por la API) ─────────────
create function private.my_clinics() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select clinic_id from public.staff where user_id = (select auth.uid()) and active
$$;

create function private.is_admin(c uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where user_id = (select auth.uid()) and clinic_id = c and active and rol = 'Administrador'
  )
$$;
revoke all on function private.my_clinics() from public;
revoke all on function private.is_admin(uuid) from public;
grant execute on function private.my_clinics() to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;

-- Siempre debe quedar al menos un administrador activo por empresa.
create function private.guard_last_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' and old.rol = 'Administrador' and old.active)
     or (tg_op = 'UPDATE' and old.rol = 'Administrador' and old.active and (new.rol <> 'Administrador' or not new.active)) then
    if not exists (
      select 1 from public.staff s
      where s.clinic_id = old.clinic_id and s.id <> old.id and s.rol = 'Administrador' and s.active
    ) and exists (select 1 from public.clinics c where c.id = old.clinic_id) then
      raise exception 'Debe quedar al menos un administrador activo' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger staff_last_admin before update or delete on public.staff for each row execute function private.guard_last_admin();

-- ───────────── Pacientes ─────────────
create table public.patients (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  name text not null check (char_length(name) between 1 and 160),
  dni text not null default '',
  phone text not null default '',
  email text,
  web boolean not null default false,
  alerts text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, id)
);
create index patients_dni on public.patients (clinic_id, dni);
create trigger patients_touch before update on public.patients for each row execute function extensions.moddatetime(updated_at);

-- ───────────── Citas ─────────────
create table public.appointments (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  date date not null,
  doctor_id integer not null,
  slot smallint not null check (slot between 0 and 31),
  dur smallint not null check (dur between 1 and 32),
  patient_name text not null check (char_length(patient_name) between 1 and 160),
  service text not null check (char_length(service) between 1 and 120),
  status text not null check (status in ('pendiente','confirmada','en-sala','atendida','cancelada','no-show','reprogramada')),
  web boolean not null default false,
  notes text,
  dni text,
  phone text,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (clinic_id, id),
  check (slot + dur <= 32),
  -- Sin doble reserva: un doctor no puede tener dos citas activas que se solapen el mismo día.
  constraint appointments_no_overlap exclude using gist (
    clinic_id with =, doctor_id with =, date with =, int4range(slot::int, (slot + dur)::int) with &&
  ) where (status <> 'cancelada')
);
create unique index appointments_token on public.appointments (public_token);
create index appointments_day on public.appointments (clinic_id, date);
create trigger appointments_touch before update on public.appointments for each row execute function extensions.moddatetime(updated_at);

-- ───────────── Cobros ─────────────
create table public.payments (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  no text not null,
  appt_id bigint,
  patient text not null,
  concept text not null,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('Efectivo','Yape','Plin','Tarjeta','Transferencia')),
  label text not null default '',
  at timestamptz not null default now(),
  primary key (clinic_id, id)
);
create index payments_at on public.payments (clinic_id, at desc);

-- ───────────── Historia clínica ─────────────
create table public.clinical_notes (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  patient_id bigint not null,
  text text not null check (char_length(text) between 1 and 4000),
  date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (clinic_id, id)
);
create index clinical_notes_patient on public.clinical_notes (clinic_id, patient_id);

-- Historia inicial (anamnesis), odontograma y plan: un documento por paciente y tipo.
create table public.patient_records (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id bigint not null,
  kind text not null check (kind in ('anamnesis','odontogram','plan')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, patient_id, kind)
);
create trigger patient_records_touch before update on public.patient_records for each row execute function extensions.moddatetime(updated_at);

create table public.patient_files (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  patient_id bigint not null,
  name text not null,
  size_label text not null default '',
  date date not null,
  storage_path text,
  created_at timestamptz not null default now(),
  primary key (clinic_id, id)
);
create index patient_files_patient on public.patient_files (clinic_id, patient_id);

-- ───────────── Configuración y cola de mensajes ─────────────
-- Documentos de la empresa: brand, media, perms, mod (planes, inventario, finanzas, campañas, sedes…).
create table public.clinic_docs (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  key text not null check (key in ('brand','media','perms','mod')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, key)
);
create trigger clinic_docs_touch before update on public.clinic_docs for each row execute function extensions.moddatetime(updated_at);

create table public.outbox (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  id bigint not null,
  kind text not null,
  channel text not null check (channel in ('whatsapp','correo')),
  patient text not null,
  appt_id bigint,
  text text not null,
  at timestamptz not null default now(),
  status text not null default 'en-cola' check (status in ('en-cola','enviado')),
  primary key (clinic_id, id)
);

-- ───────────── Seguridad por fila ─────────────
alter table public.clinics enable row level security;
alter table public.staff enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.patient_records enable row level security;
alter table public.patient_files enable row level security;
alter table public.clinic_docs enable row level security;
alter table public.outbox enable row level security;

create policy clinics_select on public.clinics for select to authenticated using (id in (select private.my_clinics()));
create policy clinics_update on public.clinics for update to authenticated using (private.is_admin(id)) with check (private.is_admin(id));

create policy staff_select on public.staff for select to authenticated using (clinic_id in (select private.my_clinics()));
create policy staff_insert on public.staff for insert to authenticated with check (private.is_admin(clinic_id));
create policy staff_update on public.staff for update to authenticated using (private.is_admin(clinic_id)) with check (private.is_admin(clinic_id));
create policy staff_delete on public.staff for delete to authenticated using (private.is_admin(clinic_id));

do $$
declare t text;
begin
  foreach t in array array['patients','appointments','payments','clinical_notes','patient_records','patient_files','outbox'] loop
    execute format('create policy %I on public.%I for select to authenticated using (clinic_id in (select private.my_clinics()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (clinic_id in (select private.my_clinics()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (clinic_id in (select private.my_clinics())) with check (clinic_id in (select private.my_clinics()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (clinic_id in (select private.my_clinics()))', t || '_delete', t);
  end loop;
end $$;

-- Marca, medios y permisos solo los cambia un administrador; el resto del personal lee y guarda sus datos de trabajo.
create policy clinic_docs_select on public.clinic_docs for select to authenticated using (clinic_id in (select private.my_clinics()));
create policy clinic_docs_insert on public.clinic_docs for insert to authenticated with check (
  (key in ('brand','media','perms') and private.is_admin(clinic_id)) or (key = 'mod' and clinic_id in (select private.my_clinics()))
);
create policy clinic_docs_update on public.clinic_docs for update to authenticated
  using ((key in ('brand','media','perms') and private.is_admin(clinic_id)) or (key = 'mod' and clinic_id in (select private.my_clinics())))
  with check ((key in ('brand','media','perms') and private.is_admin(clinic_id)) or (key = 'mod' and clinic_id in (select private.my_clinics())));
create policy clinic_docs_delete on public.clinic_docs for delete to authenticated using (private.is_admin(clinic_id));

-- Tiempo real para el personal
alter publication supabase_realtime add table public.patients, public.appointments, public.payments, public.clinical_notes, public.patient_records, public.patient_files, public.clinic_docs, public.outbox, public.staff;
