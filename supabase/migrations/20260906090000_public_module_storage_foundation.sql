-- IND-26: foundation for publishing public language modules from Supabase
-- Storage. This migration does NOT change the learner app's current loader and
-- does NOT remove local language files. It is safe to apply before files are
-- copied to Storage.

-- Public modules may be read without an access code. Private modules continue
-- to use the separate private-language-modules bucket and signed URLs.
insert into storage.buckets (id, name, public)
values ('public-language-modules', 'public-language-modules', true)
on conflict (id) do update set public = true;

-- Store where the published copy of each module lives. These fields let future
-- learner and administrator screens use configuration rather than hard-coded
-- module IDs or paths.
alter table public.language_modules
  add column if not exists content_bucket text,
  add column if not exists content_prefix text,
  add column if not exists published_version text,
  add column if not exists published_at timestamptz;

-- Register the current storage locations. Kuku's local source remains the
-- active learner-app source until its Storage copy has been uploaded and the
-- next loader change is reviewed. Bininj is already stored privately.
insert into public.language_modules (
  id,
  name,
  access_type,
  content_bucket,
  content_prefix,
  published_version,
  published_at
)
values
  (
    'kuku-thaypan',
    'Kuku Thaypan',
    'public',
    'public-language-modules',
    'kuku-thaypan',
    '1.0.0',
    now()
  ),
  (
    'bininj-kunwok',
    'Bininj Kunwok',
    'private',
    'private-language-modules',
    'bininj-kunwok',
    null,
    null
  )
on conflict (id) do update
set name = excluded.name,
    access_type = excluded.access_type,
    content_bucket = excluded.content_bucket,
    content_prefix = excluded.content_prefix,
    published_version = coalesce(
      public.language_modules.published_version,
      excluded.published_version
    );

-- A deliberately limited public catalogue for the learner app. It contains
-- module metadata only; it never exposes access codes, grants, or admin data.
create or replace function public.get_language_module_catalog()
returns table (
  id text,
  name text,
  access_type text,
  content_bucket text,
  content_prefix text,
  published_version text,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    language_modules.id,
    language_modules.name,
    language_modules.access_type,
    language_modules.content_bucket,
    language_modules.content_prefix,
    language_modules.published_version,
    language_modules.published_at
  from public.language_modules
  order by language_modules.name;
$$;

grant execute on function public.get_language_module_catalog()
to anon, authenticated;
