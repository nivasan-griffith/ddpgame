-- Language administrators are scoped to the modules assigned to them.
-- Existing administrators remain System Administrators by default.

alter table public.admin_users
  add column if not exists role text not null default 'system'
    check (role in ('system', 'language'));

create table if not exists public.language_admin_modules (
  user_id uuid not null references auth.users(id) on delete cascade,
  language_module_id text not null
    references public.language_modules(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, language_module_id)
);

alter table public.language_admin_modules enable row level security;

-- Initial setup example (replace values; do not run as-is):
-- update public.admin_users set role = 'language'
-- where user_id = 'LANGUAGE_ADMIN_AUTH_UUID';
-- insert into public.language_admin_modules (user_id, language_module_id)
-- values ('LANGUAGE_ADMIN_AUTH_UUID', 'bininj-kunwok');
