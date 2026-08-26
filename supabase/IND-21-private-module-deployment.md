# IND-21 private module deployment

The Angular code and the Edge Function source are in this repository. Complete
these steps once for the shared Supabase project before testing Bininj Kunwok
as a private module.

## 1. Apply the migration

Run `migrations/20260824090000_unlock_private_modules.sql` in the Supabase SQL
Editor, or deploy it through the Supabase CLI migration workflow. It creates:

- `module_access_grants`, which records a successful code redemption for one
  module;
- the `private-language-modules` **private** Storage bucket;
- `get_module_access_type`, used by the language selection screen; and
- `redeem_module_access_code`, which validates a code, increments its usage,
  and returns a browser-only grant token.

## Adding another language later

This design is not tied to Bininj Kunwok. Give each new module a stable ID and
add a row in `public.language_modules` with `access_type` set to `public` or
`private`. Public modules remain normal Angular assets. For a private module,
upload files under `<module-id>/` in `private-language-modules` and create its
access codes using that same module ID. An unregistered module defaults to
private, so a missed database row cannot accidentally expose its content.

## 2. Upload the private module files

In the Storage dashboard, open the `private-language-modules` bucket and upload
the Bininj Kunwok files while preserving this path structure:

```text
bininj-kunwok/manifest.json
bininj-kunwok/words.json
bininj-kunwok/audio/...
bininj-kunwok/images/...
```

The source files are currently in the repository's `languages/bininj-kunwok`
folder. The Angular build now ignores that folder, so the files are no longer
bundled into the browser app. Do not make this bucket public.

## 3. Deploy the Edge Function

From the repository root, authenticate and deploy the function:

```powershell
npx supabase login
npx supabase functions deploy private-module-download --project-ref <project-ref>
```

The hosted Edge Function uses Supabase's server-only `SUPABASE_SERVICE_ROLE_KEY`
environment variable to validate a module grant and create five-minute signed
Storage URLs. Never place that key in an Angular environment file.

## 4. Test the full user flow

1. Generate an unused Bininj Kunwok access code.
2. Run `npm start` and open the language selection screen.
3. Choose Bininj Kunwok. It should open `/access-code?moduleId=bininj-kunwok`.
4. Enter the valid code. The app records the module-specific grant, selects
   Bininj Kunwok, and opens its home page.
5. Confirm the Bininj games load images/audio from signed URLs.
6. Try an invalid, expired, inactive, or exhausted code and confirm it is denied.
7. Try the bucket's public Storage URL directly. It must not return the file.

Public modules continue to load from the app's normal `languages/` assets.

## Current no-account limitation

Until user accounts exist, the access grant is an opaque token stored in the
browser's local storage. Clearing browser storage removes that device's access;
the future Auth implementation can attach grants to user IDs without changing
the access-code model.
