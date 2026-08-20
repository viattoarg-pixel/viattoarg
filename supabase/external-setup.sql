-- =====================================================================
-- viatto — Setup completo para un proyecto Supabase EXTERNO (propio)
-- Pegar TODO este archivo en: Supabase Dashboard -> SQL Editor -> Run
-- Orden: extensiones -> tipos -> tablas -> grants -> RLS -> policies
--        -> funciones -> triggers -> storage buckets + policies
-- =====================================================================

-- ------------------------- EXTENSIONES -------------------------------
create extension if not exists "pgcrypto";

-- ------------------------- TIPOS ------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- ------------------------- TABLAS ------------------------------------

-- profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  job_title text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "Profiles viewable by authenticated users" on public.profiles;
create policy "Profiles viewable by authenticated users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated using (auth.uid() = user_id);
-- (no hay policy de DELETE: los borrados quedan denegados a propósito)

-- user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

-- función has_role (security definer: evita recursión en las policies)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Users can view own roles" on public.user_roles;
create policy "Users can view own roles"
  on public.user_roles for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- budgets (presupuestos)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  max_amount numeric not null,
  currency text not null default 'ARS',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.budgets to authenticated;
grant all on public.budgets to service_role;

alter table public.budgets enable row level security;

drop policy if exists "Users manage their own budgets" on public.budgets;
create policy "Users manage their own budgets"
  on public.budgets for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- expense_categories (categorías)
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  icon text not null default 'Tag',
  color text not null default 'hsl(var(--primary))',
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.expense_categories to authenticated;
grant all on public.expense_categories to service_role;

alter table public.expense_categories enable row level security;

drop policy if exists "Users manage their own categories" on public.expense_categories;
create policy "Users manage their own categories"
  on public.expense_categories for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- expenses (gastos)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric not null,
  description text not null default '',
  expense_date date not null default current_date,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;

alter table public.expenses enable row level security;

drop policy if exists "Users manage their own expenses" on public.expenses;
create policy "Users manage their own expenses"
  on public.expenses for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists expenses_budget_id_idx on public.expenses(budget_id);
create index if not exists expenses_user_id_idx on public.expenses(user_id);

-- ------------------------- FUNCIONES + TRIGGERS ----------------------

-- updated_at automático
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists budgets_updated_at on public.budgets;
create trigger budgets_updated_at
  before update on public.budgets
  for each row execute function public.update_updated_at_column();

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.update_updated_at_column();

-- crear perfil automáticamente al registrarse (incluye Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------- STORAGE ------------------------------------

-- buckets: receipts (privado) y avatars (público)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- receipts: cada usuario sólo accede a su propia carpeta (<uid>/archivo.jpg)
drop policy if exists "Users read own receipts" on storage.objects;
create policy "Users read own receipts"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own receipts" on storage.objects;
create policy "Users upload own receipts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own receipts" on storage.objects;
create policy "Users update own receipts"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own receipts" on storage.objects;
create policy "Users delete own receipts"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars: lectura pública, escritura sólo en la carpeta propia
drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================================
-- FIN. Después de correr esto:
--  1) Authentication -> Providers -> Google: pegar Client ID + Secret
--  2) Authentication -> URL Configuration: Site URL + Redirect URLs
--  3) Importar los CSV en este orden:
--     profiles -> budgets -> expense_categories -> expenses
--     (reemplazando los user_id viejos por los nuevos de auth.users)
-- =====================================================================
