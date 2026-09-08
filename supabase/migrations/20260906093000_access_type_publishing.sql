-- IND-26: audit trail for protected public/private publishing actions.
-- This table is written only by the administrator Edge Function using the
-- service-role key; it is not readable from the learner application.

create table if not exists public.module_access_change_log (
  id uuid primary key default gen_random_uuid(),
  language_module_id text not null
    references public.language_modules(id) on delete cascade,
  changed_by uuid not null
    references auth.users(id) on delete restrict,
  previous_access_type text not null
    check (previous_access_type in ('public', 'private')),
  new_access_type text not null
    check (new_access_type in ('public', 'private')),
  source_bucket text not null,
  destination_bucket text not null,
  file_count integer not null check (file_count >= 0),
  published_version text,
  changed_at timestamptz not null default now()
);

create index if not exists module_access_change_log_module_changed_at_idx
  on public.module_access_change_log(language_module_id, changed_at desc);

alter table public.module_access_change_log enable row level security;
