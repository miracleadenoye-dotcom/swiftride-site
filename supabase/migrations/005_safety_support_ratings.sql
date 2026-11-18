-- SwiftMovement migration 005: ratings, safety, support, blocking, QR payment check. Additive, re-runnable.
-- Your project already has ratings / saved places / emergency contacts / support tickets / blocking tables.
-- "create table if not exists" is a no-op for those; COLUMN NAMES BELOW ARE ASSUMPTIONS to verify against the real schema.

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  ratee_id uuid not null references auth.users(id) on delete cascade,
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique (ride_id, rater_id)
);
create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null, name text not null, lat double precision not null, lng double precision not null
);
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, phone text not null
);
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null, message text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  reply text,
  created_at timestamptz default now()
);
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.ratings enable row level security;
alter table public.saved_places enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.blocks enable row level security;

drop policy if exists "rate own insert" on public.ratings;
create policy "rate own insert" on public.ratings for insert with check (
  rater_id = auth.uid() and exists (select 1 from public.rides r where r.id = ride_id and r.status = 'completed'
    and ((r.customer_id = auth.uid() and r.rider_id = ratee_id) or (r.rider_id = auth.uid() and r.customer_id = ratee_id))));
drop policy if exists "rate read own" on public.ratings;
create policy "rate read own" on public.ratings for select using (rater_id = auth.uid() or ratee_id = auth.uid() or is_staff());

drop policy if exists "places own" on public.saved_places;
create policy "places own" on public.saved_places for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "contacts own" on public.emergency_contacts;
create policy "contacts own" on public.emergency_contacts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "tickets own read" on public.support_tickets;
create policy "tickets own read" on public.support_tickets for select using (user_id = auth.uid() or has_staff_role(array['support']));
drop policy if exists "tickets own insert" on public.support_tickets;
create policy "tickets own insert" on public.support_tickets for insert with check (user_id = auth.uid() and status = 'open' and reply is null);
drop policy if exists "tickets staff update" on public.support_tickets;
create policy "tickets staff update" on public.support_tickets for update using (has_staff_role(array['support'])) with check (has_staff_role(array['support']));
drop policy if exists "blocks own" on public.blocks;
create policy "blocks own" on public.blocks for all using (blocker_id = auth.uid() or is_staff()) with check (blocker_id = auth.uid());

-- Average rating for a user (no public per-driver rating shown to customers by Price Padi).
create or replace function public.my_rating() returns numeric
language sql stable security definer set search_path = public as $$
  select round(avg(score)::numeric, 2) from ratings where ratee_id = auth.uid()
$$;

-- accept_ride now respects blocking in both directions.
create or replace function public.accept_ride(p_ride uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; cust uuid;
begin
  if not exists (select 1 from riders where id = auth.uid() and verification_status = 'approved' and is_online) then
    raise exception 'Go online with a verified account first';
  end if;
  select customer_id into cust from rides where id = p_ride;
  if exists (select 1 from blocks b where (b.blocker_id = cust and b.blocked_id = auth.uid()) or (b.blocker_id = auth.uid() and b.blocked_id = cust)) then
    raise exception 'You cannot accept this ride';
  end if;
  update rides set rider_id = auth.uid(), status = 'accepted', final_price = coalesce(offered_price, fare)
    where id = p_ride and status = 'pending' and rider_id is null;
  get diagnostics n = row_count;
  if n = 1 then perform notify(cust, 'Rider accepted', 'Your rider is on the way. Share your trip PIN when they arrive.'); end if;
  return n = 1;
end $$;

-- QR payment confirmation: the rider scans the customer's QR (or types the short code).
-- The QR holds the customer's id; only the rider assigned to that customer's ride can confirm it.
create or replace function public.verify_customer_code(p_ride uuid, p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rides r where r.id = p_ride and r.rider_id = auth.uid()
    and (r.customer_id::text = p_code or left(replace(r.customer_id::text, '-', ''), 8) = lower(p_code)))
$$;

-- Weekly / monthly spend for the transport budget (completed trips).
create or replace function public.my_spend(p_since timestamptz) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(coalesce(final_price, offered_price, fare)), 0) from rides
  where customer_id = auth.uid() and status = 'completed' and created_at >= p_since
$$;
