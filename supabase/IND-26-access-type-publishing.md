# IND-26: publish a public/private access change

This guide enables the administrator portal's **Publish access change** button.
The button performs the Storage copy/removal on the server. Administrators do
not manually drag module files between buckets.

## One-time setup

1. In Supabase **SQL Editor**, create a new query.
2. Copy the full contents of
   `supabase/migrations/20260906093000_access_type_publishing.sql` and run it.
3. Expected result: **Success. No rows returned.**
4. From the repository root, deploy both updated protected functions:

   ```powershell
   npx supabase functions deploy admin-access-management --project-ref qqvfopdylqhwxhcdnxcm
   npx supabase functions deploy private-module-download --project-ref qqvfopdylqhwxhcdnxcm
   ```

The Docker warning from the CLI is expected for a cloud deployment and does not
prevent deployment.

## Administrator workflow

1. Sign into the separate `admin-panel` application.
2. Under **Language settings**, choose **Public** or **Private** for one
   language.
3. Select **Publish access change** and read the confirmation warning.
4. Confirm the action. The portal copies the module's manifest, `words.json`,
   images, and audio to the correct bucket, then changes its live access type.

## Expected behaviour

- **Private → Public**: files are copied to `public-language-modules`; existing
  access codes and grants for that module are disabled/revoked; the old private
  copy is removed after the public setting is live.
- **Public → Private**: files are copied to `private-language-modules`; the old
  public copy is removed before the module is marked private; an admin then
  generates a new access code for it.
- Every successful access change is recorded in
  `public.module_access_change_log` with the administrator, old/new access
  type, file count, version, and time.

## Important limitation

If a module was public, people may already have downloaded its files. Making
it private later stops future public downloads; it cannot retract existing
copies. The portal displays this warning before a module is made public.

## Safe test

Do not change Bininj or Kuku in the shared production project just to test the
button. Use a separate test module/copy in a test Supabase project, or wait for
team approval before changing a real language's access setting.
