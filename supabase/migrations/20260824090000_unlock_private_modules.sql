-- IND-21: persist an unlocked module grant and serve private module assets only
-- through a server-side signed URL endpoint.

create table if not exists public.module_access_grants (
  id uuid primary key default gen_random_uuid(),
  language_module_id text not null
    references public.language_modules(id) on delete cascade,
  access_code_id uuid not null
    references public.access_codes(id) on delete cascade,
  grant_token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists module_access_grants_module_id_idx
  on public.module_access_grants(language_module_id);

alter table public.module_access_grants enable row level security;

-- Private by default. Only the Edge Function's service-role client can access
-- objects in this bucket; browsers receive short-lived signed URLs instead.
insert into storage.buckets (id, name, public)
values ('private-language-modules', 'private-language-modules', false)
on conflict (id) do update set public = false;

-- Register the current public module explicitly. Future modules must also be
-- registered with either 'public' or 'private' before the app loads them.
insert into public.language_modules (id, name, access_type)
values ('kuku-thaypan', 'Kuku Thaypan', 'public')
on conflict (id) do update
set name = excluded.name,
    access_type = excluded.access_type;

-- The selection screen can ask whether a module is public/private without
-- exposing the access-code or access-grant tables. Modules not yet registered
-- in Supabase are treated as private until explicitly configured.
create or replace function public.get_module_access_type(p_module_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  module_type text;
begin
  select access_type
  into module_type
  from public.language_modules
  where id = p_module_id;

  return coalesce(module_type, 'private');
end;
$$;

grant execute on function public.get_module_access_type(text)
to anon, authenticated;

-- A grant is the stored result of a successful code redemption. Without user
-- accounts, its opaque token is saved only in the user's browser. Future Auth
-- work can add a user_id column without changing the module/code model.
create or replace function public.redeem_module_access_code(
  p_module_id text,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  matching_code public.access_codes%rowtype;
  raw_grant_token text;
begin
  select *
  into matching_code
  from public.access_codes
  where language_module_id = p_module_id
    and code_hash = encode(digest(p_access_code, 'sha256'), 'hex')
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (
      max_redemptions is null
      or redemption_count < max_redemptions
    )
  for update;

  if not found then
    return jsonb_build_object('granted', false);
  end if;

  update public.access_codes
  set redemption_count = redemption_count + 1
  where id = matching_code.id;

  raw_grant_token := encode(gen_random_bytes(32), 'hex');

  insert into public.module_access_grants (
    language_module_id,
    access_code_id,
    grant_token_hash,
    expires_at
  )
  values (
    p_module_id,
    matching_code.id,
    encode(digest(raw_grant_token, 'sha256'), 'hex'),
    matching_code.expires_at
  );

  return jsonb_build_object(
    'granted', true,
    'grant_token', raw_grant_token,
    'expires_at', matching_code.expires_at
  );
end;
$$;

grant execute on function public.redeem_module_access_code(text, text)
to anon, authenticated;
