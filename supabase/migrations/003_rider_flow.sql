-- SwiftMovement migration 003: rider flow. Additive, re-runnable.
-- ASSUMES riders(id = auth user id) and rides(id, customer_id, rider_id, status, fare, offered_price). Verify after schema review.

alter table public.rides add column if not exists final_price numeric;

create table if not exists public.ride_locations (
  ride_id uuid not null references public.rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);
alter table public.ride_locations enable row level security;
drop policy if exists "loc write own" on public.ride_locations;
create policy "loc write own" on public.ride_locations for all
  using (user_id = auth.uid()) with check (
    user_id = auth.uid() and exists (select 1 from public.rides r where r.id = ride_id and (r.rider_id = auth.uid() or r.customer_id = auth.uid())));
drop policy if exists "loc read participants" on public.ride_locations;
create policy "loc read participants" on public.ride_locations for select
  using (exists (select 1 from public.rides r where r.id = ride_id and (r.rider_id = auth.uid() or r.customer_id = auth.uid())) or is_staff());

-- ============ RIDES RLS ============
alter table public.rides enable row level security;
drop policy if exists "rides customer select" on public.rides;
create policy "rides customer select" on public.rides for select using (customer_id = auth.uid());
drop policy if exists "rides customer insert" on public.rides;
create policy "rides customer insert" on public.rides for insert with check (customer_id = auth.uid() and status = 'pending');
drop policy if exists "rides customer cancel" on public.rides;
create policy "rides customer cancel" on public.rides for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists "rides rider select" on public.rides;
create policy "rides rider select" on public.rides for select using (
  rider_id = auth.uid()
  or (status = 'pending' and exists (select 1 from public.riders d where d.id = auth.uid() and d.verification_status = 'approved' and d.is_online)));
drop policy if exists "rides staff all" on public.rides;
create policy "rides staff all" on public.rides for all using (is_staff()) with check (is_staff());

-- Customers may only cancel; they cannot change price, rider or status otherwise.
create or replace function public.guard_ride_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_staff() then return new; end if;
  if auth.uid() = old.customer_id then
    if not (new.status = 'cancelled' and old.status in ('pending','accepted')
            and new.fare is not distinct from old.fare and new.offered_price is not distinct from old.offered_price
            and new.rider_id is not distinct from old.rider_id and new.final_price is not distinct from old.final_price) then
      raise exception 'customers can only cancel a ride';
    end if;
  elsif auth.uid() is not null and auth.uid() is distinct from old.rider_id then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_ride on public.rides;
create trigger trg_guard_ride before update on public.rides for each row execute function public.guard_ride_update();

-- ============ RIDERS RLS: cannot self-approve ============
alter table public.riders enable row level security;
drop policy if exists "riders own" on public.riders;
create policy "riders own" on public.riders for all using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "riders staff all" on public.riders;
create policy "riders staff all" on public.riders for all using (has_staff_role(array['verification','support'])) with check (has_staff_role(array['verification','support']));
-- Customers need to see the assigned rider's basic details.
drop policy if exists "riders visible to their customer" on public.riders;
create policy "riders visible to their customer" on public.riders for select using (
  exists (select 1 from public.rides r where r.rider_id = riders.id and r.customer_id = auth.uid()));

create or replace function public.guard_rider_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if is_staff() or auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then new.verification_status := 'pending'; return new; end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'only staff can change verification';
  end if;
  if new.is_online and old.verification_status <> 'approved' then
    raise exception 'account is pending verification';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_rider on public.riders;
create trigger trg_guard_rider before insert or update on public.riders for each row execute function public.guard_rider_update();

-- ============ RIDE ACTIONS ============
create or replace function public.notify(p_user uuid, p_title text, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into notifications(user_id, title, body) values (p_user, p_title, p_body)
$$;
revoke execute on function public.notify(uuid, text, text) from public, anon, authenticated;

create or replace function public.accept_ride(p_ride uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int; cust uuid;
begin
  if not exists (select 1 from riders where id = auth.uid() and verification_status = 'approved' and is_online) then
    raise exception 'Go online with a verified account first';
  end if;
  update rides set rider_id = auth.uid(), status = 'accepted', final_price = coalesce(offered_price, fare)
    where id = p_ride and status = 'pending' and rider_id is null returning customer_id into cust;
  get diagnostics n = row_count;
  if n = 1 then perform notify(cust, 'Rider accepted', 'Your rider is on the way. Share your trip PIN when they arrive.'); end if;
  return n = 1;
end $$;

create or replace function public.rider_arrived(p_ride uuid) returns void
language plpgsql security definer set search_path = public as $$
declare cust uuid;
begin
  select customer_id into cust from rides where id = p_ride and rider_id = auth.uid() and status = 'accepted';
  if cust is null then raise exception 'not allowed'; end if;
  perform notify(cust, 'Rider has arrived', 'Give your rider the trip PIN to start.');
end $$;

create or replace function public.complete_ride(p_ride uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare r rides; pct numeric; commission numeric; net numeric; paid boolean := false;
begin
  select * into r from rides where id = p_ride and rider_id = auth.uid() and status = 'ongoing' for update;
  if not found then return false; end if;
  select coalesce((value->>'percent')::numeric, 10) into pct from app_config where key = 'commission';
  pct := coalesce(pct, 10);
  commission := round(coalesce(r.final_price, r.fare) * pct / 100);
  net := coalesce(r.final_price, r.fare) - commission;
  update rides set status = 'completed' where id = p_ride;
  -- Customer pays from wallet if funded; otherwise cash on trip.
  update wallets set balance = balance - coalesce(r.final_price, r.fare)
    where user_id = r.customer_id and balance >= coalesce(r.final_price, r.fare);
  if found then
    paid := true;
    insert into wallet_transactions(user_id, kind, amount, ref, note) values (r.customer_id, 'ride_payment', -coalesce(r.final_price, r.fare), p_ride::text, 'Ride payment');
    insert into wallets(user_id, balance) values (auth.uid(), net) on conflict (user_id) do update set balance = wallets.balance + net;
  end if;
  insert into wallet_transactions(user_id, kind, amount, ref, note) values (auth.uid(), 'earning', net, p_ride::text, case when paid then 'Wallet payment' else 'Cash trip (collect fare)' end);
  insert into wallet_transactions(user_id, kind, amount, ref, note) values (auth.uid(), 'commission', commission, p_ride::text, 'Platform commission ' || pct || '%');
  perform notify(r.customer_id, 'Trip completed', 'Thanks for riding with Swift Movement. Please rate your rider.');
  return true;
end $$;

-- Realtime for live updates
do $$ begin
  begin alter publication supabase_realtime add table public.rides; exception when others then null; end;
  begin alter publication supabase_realtime add table public.ride_locations; exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;
