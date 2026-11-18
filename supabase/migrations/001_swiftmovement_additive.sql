-- SwiftMovement migration 001: additive only. Safe to re-run. Does NOT drop or recreate anything.
-- Run in Supabase SQL Editor (project SWIFTRIDE).

-- ============ ROLES (separate table, never trusted from client) ============
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer','rider')),
  created_at timestamptz default now()
);

create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','support','finance','verification')),
  active boolean not null default true,
  pin_hash text,                       -- set via set_staff_pin(); never readable by client
  created_at timestamptz default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_roles where user_id = auth.uid() and active)
$$;

create or replace function public.has_staff_role(roles text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff_roles where user_id = auth.uid() and active
                 and (role = any(roles) or role = 'super_admin'))
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select 'staff:' || role from staff_roles where user_id = auth.uid() and active),
    (select role from user_roles where user_id = auth.uid()))
$$;

-- Staff second confirmation step: PIN verified on the server, hash never exposed.
create extension if not exists pgcrypto;
create or replace function public.verify_staff_pin(p_pin text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from staff_roles where user_id = auth.uid() and active
                 and pin_hash is not null and pin_hash = crypt(p_pin, pin_hash))
$$;
create or replace function public.set_staff_pin(p_user uuid, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not has_staff_role(array['super_admin']) then raise exception 'not allowed'; end if;
  update staff_roles set pin_hash = crypt(p_pin, gen_salt('bf')) where user_id = p_user;
end $$;

alter table public.user_roles enable row level security;
alter table public.staff_roles enable row level security;
drop policy if exists "own role read" on public.user_roles;
create policy "own role read" on public.user_roles for select using (user_id = auth.uid() or is_staff());
drop policy if exists "own role insert" on public.user_roles;
create policy "own role insert" on public.user_roles for insert with check (user_id = auth.uid() and role in ('customer','rider'));
drop policy if exists "staff read own" on public.staff_roles;
create policy "staff read own" on public.staff_roles for select using (user_id = auth.uid());
-- staff_roles is only written by super admin via SQL / service role (no client write policy).
revoke select (pin_hash) on public.staff_roles from anon, authenticated;

-- ============ VEHICLES & FARES ============
create table if not exists public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- Motorcycle, Car, ...
  description text,
  active boolean not null default true,
  sort int default 0
);
create table if not exists public.vehicle_grades (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vehicle_categories(id) on delete cascade,
  name text not null,                 -- e.g. Standard, Premium (condition / newness)
  description text,
  features text[] default '{}',
  base_fare numeric not null default 300,
  per_km numeric not null default 120,
  min_fare numeric not null default 500,
  active boolean not null default true
);

-- ============ LOCATIONS (admin can add towns/streets) ============
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  town text not null,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  active boolean not null default true,
  unique (town, name)
);

-- ============ WALLET / LEDGER ============
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0)
);
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fund','ride_payment','earning','commission','refund','withdrawal')),
  amount numeric not null,
  ref text,                           -- gateway reference (Paystack/Flutterwave later)
  note text,
  created_at timestamptz default now()
);
create table if not exists public.budgets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  period text not null default 'monthly' check (period in ('weekly','monthly')),
  amount numeric not null default 0,
  warn_at numeric not null default 0.8
);

-- ============ NOTIFICATIONS / ADVERTS / PRICE PADI / CONFIG ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz default now()
);
create table if not exists public.adverts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  image_url text,
  link_url text,
  audience text not null default 'all' check (audience in ('all','customer','rider')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);
create table if not exists public.price_padi_phrases (
  id uuid primary key default gen_random_uuid(),
  verdict text not null check (verdict in ('fair','cheap','pricey','too_low')),
  title text not null,
  phrase text not null,
  active boolean not null default true
);
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null
);

-- ============ ADDITIVE COLUMNS ON EXISTING TABLES (only if the table exists) ============
do $$ begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles add column if not exists price_padi_name text;
    alter table public.profiles add column if not exists account_status text not null default 'active';
    alter table public.profiles add column if not exists avatar_path text;
  end if;
  if to_regclass('public.riders') is not null then
    alter table public.riders add column if not exists verification_status text not null default 'pending';
    alter table public.riders add column if not exists is_online boolean not null default false;
    alter table public.riders add column if not exists vehicle_grade_id uuid references public.vehicle_grades(id);
    alter table public.riders add column if not exists plate_number text;
    alter table public.riders add column if not exists photo_paths jsonb default '{}';
  end if;
  if to_regclass('public.rides') is not null then
    alter table public.rides add column if not exists offered_price numeric;
    alter table public.rides add column if not exists vehicle_grade_id uuid references public.vehicle_grades(id);
    alter table public.rides add column if not exists is_load boolean not null default false;
    alter table public.rides add column if not exists load_description text;
    alter table public.rides add column if not exists load_weight_kg numeric;
    alter table public.rides add column if not exists load_size text;
  end if;
end $$;

-- ============ RLS ON NEW TABLES ============
alter table public.vehicle_categories enable row level security;
alter table public.vehicle_grades enable row level security;
alter table public.locations enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.notifications enable row level security;
alter table public.adverts enable row level security;
alter table public.price_padi_phrases enable row level security;
alter table public.app_config enable row level security;

do $$
declare t text;
begin
  -- public-read catalogue tables, staff-managed
  foreach t in array array['vehicle_categories','vehicle_grades','locations','price_padi_phrases','adverts','app_config'] loop
    execute format('drop policy if exists "read %1$s" on public.%1$I', t);
    execute format('create policy "read %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "staff write %1$s" on public.%1$I', t);
    execute format($p$create policy "staff write %1$s" on public.%1$I for all to authenticated
       using (has_staff_role(array['super_admin','support'])) with check (has_staff_role(array['super_admin','support']))$p$, t);
  end loop;
end $$;

drop policy if exists "wallet own" on public.wallets;
create policy "wallet own" on public.wallets for select using (user_id = auth.uid() or has_staff_role(array['finance']));
drop policy if exists "tx own" on public.wallet_transactions;
create policy "tx own" on public.wallet_transactions for select using (user_id = auth.uid() or has_staff_role(array['finance']));
-- No client insert/update on wallets or transactions: all money moves go through the functions below.

drop policy if exists "budget own" on public.budgets;
create policy "budget own" on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notif own read" on public.notifications;
create policy "notif own read" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notif own update" on public.notifications;
create policy "notif own update" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notif staff insert" on public.notifications;
create policy "notif staff insert" on public.notifications for insert with check (has_staff_role(array['super_admin','support']));

-- Internal ledger: fund wallet (gateway plug-in point: call this after verifying a Paystack/Flutterwave webhook).
create or replace function public.wallet_fund(p_amount numeric, p_ref text default null) returns numeric
language plpgsql security definer set search_path = public as $$
declare nb numeric;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  if p_amount <= 0 or p_amount > 500000 then raise exception 'invalid amount'; end if;
  insert into wallets(user_id, balance) values (auth.uid(), 0) on conflict do nothing;
  update wallets set balance = balance + p_amount where user_id = auth.uid() returning balance into nb;
  insert into wallet_transactions(user_id, kind, amount, ref, note) values (auth.uid(),'fund',p_amount,p_ref,'Wallet funding (internal ledger)');
  return nb;
end $$;

-- ============ STORAGE: private "photos" bucket, files under <user_id>/... ============
drop policy if exists "photos own read" on storage.objects;
create policy "photos own read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));
drop policy if exists "photos own write" on storage.objects;
create policy "photos own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos own update" on storage.objects;
create policy "photos own update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
update storage.buckets set public = false where id = 'photos';

-- ============ SEED DATA ============
insert into public.vehicle_categories(name, description, sort)
  select 'Motorcycle','Okada rides around Ekiti',1 where not exists (select 1 from public.vehicle_categories where name='Motorcycle');
insert into public.vehicle_grades(category_id, name, description)
  select c.id, g.name, g.d from public.vehicle_categories c,
   (values ('Standard','Good condition bike'),('Premium','Newer, well-kept bike')) as g(name,d)
  where c.name='Motorcycle' and not exists (select 1 from public.vehicle_grades v where v.category_id=c.id);
insert into public.locations(town,name,lat,lng) values
  ('Ado-Ekiti','Ajilosun Street',7.6210,5.2210),
  ('Ado-Ekiti','Okesha',7.6280,5.2200),
  ('Ado-Ekiti','Oja Oba',7.6240,5.2210),
  ('Ado-Ekiti','Ilokun',7.6150,5.2400),
  ('Ado-Ekiti','Basiri',7.6350,5.2100),
  ('Ado-Ekiti','Iyin Road',7.6000,5.2300)
  on conflict do nothing;
insert into public.price_padi_phrases(verdict,title,phrase) values
  ('fair','Fair Deal','Fair Deal! Everybody go chop.'),
  ('cheap','Your Pocket Is Safe','Your pocket is safe, oga. Enjoy am.'),
  ('pricey','This One Is Somehow Expensive','This one is somehow expensive o. Try another offer.'),
  ('too_low','Omo, Check That Price Again','Omo, check that price again. Rider fit just look you pass.')
  on conflict do nothing;
insert into public.app_config(key,value) values
  ('commission', '{"percent": 10}'),
  ('load_limits', '{"max_weight_kg": 25, "max_size": "Fits on a bike carrier"}')
  on conflict do nothing;
