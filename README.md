# Swift Movement (formerly SwiftRide)

Ride-hailing and mobility web app for Ekiti State, Nigeria. React + TypeScript + Vite + Tailwind, Supabase backend, installable PWA, deploys on Vercel.

Three separate views, one per role: **Customer**, **Rider**, **Admin/Staff**. The role lives in the database (`user_roles`, `staff_roles`) and is enforced by Row Level Security. Choosing a role on the Welcome screen grants nothing by itself.

## 1. Supabase setup (project "SWIFTRIDE")

All migrations are additive and re-runnable. They never drop or recreate your tables.

1. Open **SQL Editor** and run, in order:
   - `supabase/migrations/001_swiftmovement_additive.sql` (roles, vehicles, locations, wallet, notifications, adverts, Price Padi, storage policies, seed data)
   - `002_trip_pin.sql` (trip PIN kept away from the rider)
   - `003_rider_flow.sql` (rides/riders RLS, accept/complete, live location)
   - `004_admin.sql` (staff functions, stats, suspension)
   - `005_safety_support_ratings.sql` (ratings, contacts, tickets, blocking, QR check)
2. **Check column names.** The app assumes these (see `src/lib/db.ts`). If your existing tables differ, adjust the queries or the migrations:
   - `profiles(id, full_name, phone, email)`, `riders(id)`, `rides(id, customer_id, rider_id, pickup_*, dest_*, distance_km, fare, status)`
   - `ratings`, `saved_places`, `emergency_contacts`, `support_tickets`, `blocks`
3. **Auth > Email:** enable Email provider, and edit the **Magic Link** email template to include the code: `Your Swift Movement code: {{ .Token }}`. The app uses the 6-digit email OTP on every login.
4. **Auth > URL configuration:** add your Vercel URL and `http://localhost:5173` to the redirect URLs (needed for password recovery).
5. **Storage:** keep the `photos` bucket **private**. Policies from migration 001 limit each user to their own folder; staff can view all.
6. **Realtime:** migration 003 adds `rides`, `ride_locations`, `notifications` to the realtime publication.

### Create the first staff account
1. Create the user in **Authentication > Users** (email + password).
2. Run in the SQL Editor (replace the UUID and PIN):
   ```sql
   insert into staff_roles(user_id, role) values ('<USER-UUID>', 'super_admin');
   update staff_roles set pin_hash = crypt('123456', gen_salt('bf')) where user_id = '<USER-UUID>';
   ```
3. Log in at `/staff/login`: password, then email OTP, then staff PIN.

Roles: `super_admin` (everything), `support` (users, vehicles, tickets, bookings), `finance` (bookings, revenue), `verification` (rider approval).

## 2. Run locally
```bash
cp .env.example .env     # fill in the two values
npm install
npm run dev
```

## 3. Deploy on Vercel
1. Push this repo to GitHub, then **Add New > Project** in Vercel and import it.
2. Framework preset: **Vite** (build `npm run build`, output `dist`; already set in `vercel.json`, which also rewrites all routes to `index.html` for the SPA).
3. Add environment variables (Production + Preview):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon** public key |

Never add the service-role key anywhere in this project.

## 4. Manual test checklist
1. Sign up as customer, log in (OTP), upload photo, name Price Padi.
2. Sign up as rider, submit photos and vehicle; approve in Admin > Verify.
3. Customer books a ride; rider (online) accepts, enters the trip PIN, confirms the customer code/QR, completes.
4. Check wallet, rating, notifications, earnings, admin stats.

## Notes
- Fare: `max(min_fare, base + per_km x km)`, editable per vehicle grade in Admin > Vehicles.
- Price Padi is rule-based advice only. It never blocks an offer or booking.
- Payments: internal ledger. Plug Paystack/Flutterwave in at `wallet_fund` (verify the webhook server-side, then credit).
- Placeholder logo and icons: regenerate icons with `scripts/make-icons.ps1` or replace `public/icon-*.png` and `favicon.svg` when the logo is ready.
- Future (design kept ready, not built): restaurant/parcel partners, cars and other vehicles (just add categories), driver subscriptions, payment gateway.
