do $$
begin
  -- If the table exists and still has the legacy column, rename it.
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'appointments'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'appointments'
        and column_name = 'appointment_time'
    ) then
      alter table public.appointments rename column appointment_time to appointment_at;
    end if;
  end if;
end $$;

create extension if not exists pgcrypto;

create table if not exists public.clinics (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.clinics (id, name)
values ('central-clinic', 'Central Clinic')
on conflict (id) do nothing;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null default 'central-clinic' references public.clinics(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  dob date,
  gender text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null default 'central-clinic' references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  patient_name text not null,
  doctor_name text not null,
  appointment_type text not null,
  appointment_at timestamptz not null,
  no_show boolean not null default false,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.appointments
add column if not exists no_show boolean not null default false;

create index if not exists appointments_patient_id_idx on public.appointments(patient_id);
create index if not exists appointments_at_idx on public.appointments(appointment_at);

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null default 'central-clinic' references public.clinics(id) on delete cascade,
  auth_user_id uuid,
  full_name text not null,
  email text not null unique,
  role text not null,
  department text not null,
  status text not null default 'Active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.staff_users
add column if not exists auth_user_id uuid;

create index if not exists staff_users_role_idx on public.staff_users(role);
create index if not exists staff_users_status_idx on public.staff_users(status);
create index if not exists staff_users_auth_user_id_idx on public.staff_users(auth_user_id);

create table if not exists public.clinic_settings (
  clinic_key text primary key,
  clinic_id text not null default 'central-clinic' references public.clinics(id) on delete cascade,
  clinic_name text not null default 'Sanctuary Health Center',
  primary_email text not null default 'admin@sanctuaryhealth.com',
  clinic_address text not null default '742 Medical District Dr, Suite 100, San Francisco, CA',
  monday_open text not null default '08:00 AM',
  monday_close text not null default '06:00 PM',
  tuesday_open text not null default '08:00 AM',
  tuesday_close text not null default '06:00 PM',
  sunday_closed boolean not null default true,
  slot_duration_minutes integer not null default 30,
  buffer_time_minutes integer not null default 10,
  high_risk_threshold integer not null default 70,
  automated_risk_reminders boolean not null default true,
  auto_fill_rescheduling boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.clinic_settings (clinic_key)
values ('default')
on conflict (clinic_key) do nothing;

create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  role text default 'Admin',
  selected_clinic_id text not null default 'central-clinic' references public.clinics(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
