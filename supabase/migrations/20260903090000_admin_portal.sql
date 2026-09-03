-- IND-25 / IND-82 / IND-26: administrator portal foundation.
-- This migration adds the server-side record that identifies which Supabase
-- Auth users are allowed to use the separate administrator portal.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Labels are optional internal notes, for example "Darwin school trial".
-- The actual access code remains stored only as a secure hash.
alter table public.access_codes
  add column if not exists label text;

-- No browser-facing policy is deliberately added to admin_users or
-- access_codes. The admin portal uses the authenticated Edge Function below;
-- that function checks admin_users with its server-only service-role client.
-- Learner-facing validation functions retain their existing limited access.
