-- SwiftMovement migration 004: admin / staff. Additive, re-runnable.
-- ASSUMES profiles(id, full_name, phone, email, account_status).

-- Staff can read people; writes only through the role-checked functions below.
drop policy if exists "profiles staff read" on public.profiles;
create policy "profiles staff read" on public.profiles for select using (is_staff());
drop policy if exists "user_roles staff read" on public.user_roles;
create policy "user_roles staff read" on public.user_roles for select using (is_staff());
drop policy if exists "wallet tx staff read" on public.wallet_transactions;
create policy "wallet tx staff read" on public.wallet_transactions for select using (has_staff_role(array['finance']));

-- Suspended accounts cannot book rides or go online.
create or replace function public.block_suspended() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  uid := case tg_table_name when 'rides' then new.customer_id else new.id end;
  if tg_table_name = 'riders' and not new.is_online then return new; end if;
  if exists (select 1 from profiles where id = uid and account_status <> 'active') then
    raise exception 'Your account is suspended. Contact support.';
  end if;
  return new;
end $$;
drop trigger if exists trg_block_suspended_rides on public.rides;
create trigger trg_block_suspended_rides before insert on public.rides for each row execute function public.block_suspended();
drop trigger if exists trg_block_suspended_riders on public.riders;
create trigger trg_block_suspended_riders before update on public.riders for each row execute function public.block_suspended();

create or replace function public.admin_set_account_status(p_user uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_staff_role(array['support']) then raise exception 'not allowed'; end if;
  if p_status not in ('active','suspended') then raise exception 'invalid status'; end if;
  if exists (select 1 from staff_roles where user_id = p_user) then raise exception 'cannot change staff accounts'; end if;
  update profiles set account_status = p_status where id = p_user;
  if p_status = 'suspended' then update riders set is_online = false where id = p_user; end if;
  perform notify(p_user, case when p_status = 'active' then 'Account restored' else 'Account suspended' end,
                 case when p_status = 'active' then 'Your account is active again.' else 'Please contact support.' end);
end $$;

create or replace function public.admin_review_rider(p_rider uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_staff_role(array['verification']) then raise exception 'not allowed'; end if;
  if p_status not in ('approved','rejected') then raise exception 'invalid status'; end if;
  update riders set verification_status = p_status, is_online = case when p_status = 'approved' then is_online else false end where id = p_rider;
  perform notify(p_rider, case when p_status = 'approved' then 'You are verified' else 'Verification rejected' end,
                 case when p_status = 'approved' then 'You can now go online and receive rides.' else 'Please update your details or contact support.' end);
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  return jsonb_build_object(
    'customers', (select count(*) from user_roles where role = 'customer'),
    'riders', (select count(*) from user_roles where role = 'rider'),
    'pending_riders', (select count(*) from riders where verification_status = 'pending' and photo_paths is not null and photo_paths <> '{}'::jsonb),
    'rides_total', (select count(*) from rides),
    'rides_pending', (select count(*) from rides where status = 'pending'),
    'rides_ongoing', (select count(*) from rides where status = 'ongoing'),
    'rides_completed', (select count(*) from rides where status = 'completed'),
    'gross', (select coalesce(sum(coalesce(final_price, fare)), 0) from rides where status = 'completed'),
    'revenue', case when has_staff_role(array['finance']) then (select coalesce(sum(amount), 0) from wallet_transactions where kind = 'commission') else null end
  );
end $$;
