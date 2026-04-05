-- ============================================================
-- Purchase Control App - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null default 'purchaser'
    check (role in ('admin', 'purchaser', 'warehouse_manager', 'finance')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view all profiles"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can update any profile"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'purchaser')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- SUPPLIERS
-- ============================================================
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table suppliers enable row level security;

create policy "Authenticated users can view suppliers"
  on suppliers for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert suppliers"
  on suppliers for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update suppliers"
  on suppliers for update using (auth.role() = 'authenticated');

-- ============================================================
-- PURCHASES (main record)
-- ============================================================
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,
  title text not null,
  description text,
  category text,
  supplier_id uuid references suppliers(id),
  supplier_name text,
  currency text not null default 'EUR',
  estimated_value numeric(14,2),
  final_value numeric(14,2),
  current_step text not null default 'request',
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled', 'on_hold')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table purchases enable row level security;

create policy "Authenticated users can view purchases"
  on purchases for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert purchases"
  on purchases for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update purchases"
  on purchases for update using (auth.role() = 'authenticated');

-- ============================================================
-- PURCHASE STEPS
-- ============================================================
create table if not exists purchase_steps (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  step_key text not null,
  step_name text not null,
  step_order int not null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'skipped', 'blocked')),
  data jsonb not null default '{}',
  completed_at timestamptz,
  completed_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id, step_key)
);

alter table purchase_steps enable row level security;

create policy "Authenticated users can view steps"
  on purchase_steps for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert steps"
  on purchase_steps for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update steps"
  on purchase_steps for update using (auth.role() = 'authenticated');

-- ============================================================
-- STEP NOTES / COMMENTS
-- ============================================================
create table if not exists step_notes (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  step_key text not null,
  content text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table step_notes enable row level security;

create policy "Authenticated users can view notes"
  on step_notes for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert notes"
  on step_notes for insert with check (auth.role() = 'authenticated');

create policy "Authors can delete own notes"
  on step_notes for delete using (auth.uid() = created_by);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table if not exists purchase_activity (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  step_key text,
  action text not null,
  description text not null,
  performed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table purchase_activity enable row level security;

create policy "Authenticated users can view activity"
  on purchase_activity for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activity"
  on purchase_activity for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- REALTIME - enable for live updates
-- ============================================================
alter publication supabase_realtime add table purchases;
alter publication supabase_realtime add table purchase_steps;
alter publication supabase_realtime add table step_notes;
alter publication supabase_realtime add table purchase_activity;

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure update_updated_at();

create trigger update_purchases_updated_at before update on purchases
  for each row execute procedure update_updated_at();

create trigger update_steps_updated_at before update on purchase_steps
  for each row execute procedure update_updated_at();

create trigger update_suppliers_updated_at before update on suppliers
  for each row execute procedure update_updated_at();

-- ============================================================
-- FUNCTION: get next reference number
-- ============================================================
create or replace function get_next_po_number()
returns text language plpgsql as $$
declare
  year_str text := to_char(now(), 'YYYY');
  count_val int;
begin
  select count(*) + 1 into count_val
  from purchases
  where reference_number like 'PO-' || year_str || '-%';
  return 'PO-' || year_str || '-' || lpad(count_val::text, 4, '0');
end;
$$;
