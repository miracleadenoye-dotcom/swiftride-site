-- SwiftMovement migration 002: trip PIN kept out of the rider's reach. Additive, re-runnable.
-- ASSUMES rides(id, customer_id, rider_id, status) exist. Adjust names after schema review.

create table if not exists public.ride_pins (
  ride_id uuid primary key references public.rides(id) on delete cascade,
  pin text not null
);
alter table public.ride_pins enable row level security;
drop policy if exists "customer reads own pin" on public.ride_pins;
create policy "customer reads own pin" on public.ride_pins for select
  using (exists (select 1 from public.rides r where r.id = ride_id and r.customer_id = auth.uid()));
-- no insert/update policy: the trigger below (security definer) is the only writer.

create or replace function public.gen_ride_pin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into ride_pins(ride_id, pin) values (new.id, lpad((floor(random()*10000))::int::text, 4, '0'))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists trg_ride_pin on public.rides;
create trigger trg_ride_pin after insert on public.rides for each row execute function public.gen_ride_pin();

-- Rider enters the PIN the customer tells them; checked on the server.
create or replace function public.start_ride(p_ride uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select exists (select 1 from ride_pins p join rides r on r.id = p.ride_id
                 where p.ride_id = p_ride and p.pin = p_pin
                   and r.rider_id = auth.uid() and r.status = 'accepted') into ok;
  if ok then update rides set status = 'ongoing' where id = p_ride; end if;
  return ok;
end $$;
