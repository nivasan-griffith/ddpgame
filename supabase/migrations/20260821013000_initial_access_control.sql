-- Backend foundation for public/private language modules and access-code validation.
-- Run through Supabase migrations for a new environment. This migration contains
-- no real access codes or module data.

create extension if not exists pgcrypto;

create table if not exists public.language_modules (
  id text primary key,
  name text not null,
  access_type text not null default 'public'
    check (access_type in ('public', 'private')),
  created_at timestamptz not null default now()
);

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  language_module_id text not null
    references public.language_modules(id) on delete cascade,
  code_hash text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  max_redemptions integer,
  redemption_count integer not null default 0,
  created_at timestamptz not null default now(),

  constraint access_codes_max_redemptions_check
    check (max_redemptions is null or max_redemptions > 0),

  constraint access_codes_redemption_count_check
    check (redemption_count >= 0)
);

alter table public.language_modules enable row level security;
alter table public.access_codes enable row level security;

create or replace function public.validate_access_code(
  p_module_id text,
  p_access_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return exists (
    select 1
    from public.access_codes
    where language_module_id = p_module_id
      and code_hash = encode(digest(p_access_code, 'sha256'), 'hex')
      and is_active = true
      and (expires_at is null or expires_at > now())
      and (
        max_redemptions is null
        or redemption_count < max_redemptions
      )
  );
end;
$$;

grant execute on function public.validate_access_code(text, text)
to anon, authenticated;

-- Validates and records a code redemption in one atomic database operation.
create or replace function public.redeem_access_code(
  p_module_id text,
  p_access_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  was_redeemed boolean;
begin
  update public.access_codes
  set redemption_count = redemption_count + 1
  where language_module_id = p_module_id
    and code_hash = encode(digest(p_access_code, 'sha256'), 'hex')
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (
      max_redemptions is null
      or redemption_count < max_redemptions
    )
  returning true into was_redeemed;

  return coalesce(was_redeemed, false);
end;
$$;

grant execute on function public.redeem_access_code(text, text)
to anon, authenticated;
