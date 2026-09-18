# Indigenous Languages administrator portal

This is a separate responsive Angular web application for administrators. It
does not add administrator pages to the learner app. Both applications use the
same Supabase project, so language and access-code changes take effect in the
learner app immediately.

## What it supports

- System Administrator and Language Administrator roles
- system-wide or module-scoped language visibility
- secure private-language access-code generation, editing, and revocation
- public/private module publishing through the correct Supabase Storage bucket
- assigning one or more language modules to a Language Administrator
- creating and removing administrator portal access
- creating and deleting language modules as a System Administrator
- editing a language name and word entries as an assigned administrator
- keeping the Storage manifest, word data, and catalogue version in sync

The readable value of an access code is displayed once after generation. Only
its hash is stored, so an old code cannot be viewed or altered later.

Language content remains a manifest plus the JSON data file named by its
`data` field (currently `words.json`). The portal validates edits, preserves
unrecognised entry metadata, and increments the manifest patch version on each
write. Optimistic version checks reject stale edits instead of overwriting a
newer change. Image and audio fields are safe, module-relative paths; upload of
new media files remains a separate Storage operation.

Only System Administrators can create or delete a language. Assigned Language
Administrators can read and edit the name and words for their assigned
languages. Deleting a word deliberately retains media files because another
entry may reference them.

## One-time Supabase setup

Run the administrator migrations in the Supabase SQL Editor, in filename order:

1. `supabase/migrations/20260903090000_admin_portal.sql`
2. `supabase/migrations/20260910090000_language_admin_roles.sql`

Create the first administrator in **Authentication → Users**, then register
that Auth account as a System Administrator. Replace the placeholder UUID:

```sql
insert into public.admin_users (user_id, display_name)
values ('AUTH_USER_UUID_HERE', 'System Administrator');
```

`role` defaults to `system` for this initial account.

Deploy the protected backend endpoint from the repository root:

```powershell
npx supabase functions deploy admin-access-management --project-ref YOUR_PROJECT_REF
```

The project ref is visible in the Supabase project URL and settings. Do not
place the service-role key in either browser application.

## Day-to-day administration

- A System Administrator sees all language modules and the **Users** page.
- A Language Administrator sees only modules assigned to their account.
- A System Administrator can change a module between public and private. This
  copies files to the required Storage bucket before the setting changes.
- Access codes are managed from a private language's **Configure → Settings**
  page.
- Removing a Language Administrator revokes their portal permissions but keeps
  their Supabase Auth login, allowing reassignment later.

## Run locally

From this `admin-panel` folder:

```powershell
npm install
npm start
```

Open the local URL reported by Angular, normally `http://localhost:4200`.
Use an Incognito/InPrivate window when testing a second administrator account,
because normal browser tabs share the same Supabase login session.

## Runtime configuration

The portal reads its Supabase server address from
`src/assets/config/app-config.json` before the application starts. To point a
deployed build at another Supabase project, update the copied
`assets/config/app-config.json` file on the web server; rebuilding the portal
is not required. Use the same `serverUrl` as the learner application.

The public publishable key remains part of the compiled environment files. A
server URL and publishable key must belong to the same Supabase project.

## Security model

The browser receives only the Supabase project URL and publishable key. It
never receives a service-role key. Every portal request includes the signed-in
user session and is checked by the `admin-access-management` Edge Function. The
function verifies the account's role and assigned modules server-side before it
reads or changes module/code records or Storage content with its server-only
credentials.

Language mutations first reserve the next version in the catalogue, then write
the word data and manifest. If either Storage write fails, the function restores
the previous files and catalogue version. A language deletion removes its
catalogue record (including cascading assignments and codes) before cleaning up
the exact configured Storage prefix; the portal reports when that cleanup needs
manual follow-up.

Disabling an access code prevents further redemption and revokes its stored
private-file grants. Previously downloaded offline module copies cannot be
removed remotely from a learner's device.
