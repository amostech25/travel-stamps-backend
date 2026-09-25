-- Travel Stamps database
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Stamps (every submission, whatever its status)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.stamps (
  id           uuid primary key default gen_random_uuid(),
  country      text not null check (char_length(country) between 1 and 80),
  city         text not null check (char_length(city) between 1 and 80),
  place_name   text not null check (char_length(place_name) between 1 and 120),
  tags         text[] not null check (cardinality(tags) between 1 and 12),
  verdict      text not null check (verdict in ('must', 'worth', 'okay', 'skip')),
  note         text check (note is null or char_length(note) <= 1000),
  map_link     text not null check (char_length(map_link) <= 500),
  lat          double precision not null check (lat between -90 and 90),
  lng          double precision not null check (lng between -180 and 180),
  contributor  text check (contributor is null or char_length(contributor) <= 40),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists stamps_status_created_idx on public.stamps (status, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- The admin (one row: your Supabase Auth user id)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ─────────────────────────────────────────────────────────────
-- Spam protection: hashed IPs only, kept for 7 days
-- ─────────────────────────────────────────────────────────────
create table if not exists public.submission_log (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists submission_log_ip_idx on public.submission_log (ip_hash, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Row-level security
--   • Visitors can only read APPROVED stamps.
--   • Nobody can insert from the browser: new stamps go through the
--     website's server, which checks for spam and reads the map link.
--   • Only the admin can see pending/rejected stamps, approve, reject or remove.
-- ─────────────────────────────────────────────────────────────
alter table public.stamps enable row level security;
alter table public.admins enable row level security;
alter table public.submission_log enable row level security;

drop policy if exists "Approved stamps are public" on public.stamps;
create policy "Approved stamps are public"
  on public.stamps for select
  to anon, authenticated
  using (status = 'approved' or public.is_admin());

drop policy if exists "Admin can review stamps" on public.stamps;
create policy "Admin can review stamps"
  on public.stamps for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin can remove stamps" on public.stamps;
create policy "Admin can remove stamps"
  on public.stamps for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "Admin can see own admin row" on public.admins;
create policy "Admin can see own admin row"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- submission_log has no policies: only the server (service role) can use it.

-- ─────────────────────────────────────────────────────────────
-- Housekeeping (matches the privacy notice)
--   • IP hashes deleted after 7 days
--   • Rejected stamps deleted 30 days after the decision
-- The website runs this on every submission. You can also schedule it:
-- Dashboard → Integrations → Cron → create a job that runs
--   select public.purge_old_data();
-- once a day.
-- ─────────────────────────────────────────────────────────────
create or replace function public.purge_old_data()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.submission_log where created_at < now() - interval '7 days';
  delete from public.stamps where status = 'rejected' and reviewed_at < now() - interval '30 days';
$$;

revoke execute on function public.purge_old_data() from public, anon, authenticated;
grant execute on function public.purge_old_data() to service_role;

-- ─────────────────────────────────────────────────────────────
-- Make yourself the admin (run AFTER creating your user under
-- Authentication → Users → Add user). Replace the email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com';
-- ─────────────────────────────────────────────────────────────
