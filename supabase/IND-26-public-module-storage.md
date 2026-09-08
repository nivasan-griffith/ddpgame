# IND-26: public language-module Storage foundation

This is a safe preparation step for moving **public** language modules from the
Angular repository into Supabase Storage. It does not change the learner app's
current behaviour and does not delete the existing Kuku Thaypan files.

## What this sets up

- A public Storage bucket named `public-language-modules`.
- Module metadata that records each module's access type and Storage location.
- A small, safe catalogue function for a future learner-app loader.

`private-language-modules` remains private. It still uses the existing
server-side Edge Function and short-lived signed URLs.

## One-time setup

1. In Supabase, open **SQL Editor** and create a new query.
2. Copy the complete contents of
   `supabase/migrations/20260906090000_public_module_storage_foundation.sql`
   into the editor and select **Run**.
3. Expected result: **Success. No rows returned.**
4. Open **Storage → Buckets**. Confirm `public-language-modules` exists and is
   marked public. Confirm `private-language-modules` is still not public.

## Copy Kuku Thaypan safely

Do this only after the one-time setup succeeds. Copy files; do not delete or
move the local source yet.

1. In **Storage → public-language-modules**, create a folder named
   `kuku-thaypan`.
2. Upload a copy of the current local files while preserving this structure:

   ```text
   kuku-thaypan/
     manifest.json
     words.json
     images/...
     audio/...
   ```

   The local source folder is:
   `languages/kuku-thaypan/`.
3. In Storage, open `kuku-thaypan/manifest.json` and one image to confirm they
   can be read from the public bucket.

The local source folder remains in Git as a rollback/reference copy. It is not
deleted by this setup.

## What comes next

The learner-app loader on the IND-26 branch reads public module data from this
catalogue/Storage location. Test it with a fresh browser profile or private
window: open the language selection screen, download Kuku Thaypan, and confirm
its words, images, and available audio load. A normal existing browser can
continue using its saved offline Kuku copy, so it is not a reliable first test
of the new remote source.

Before deleting any old local source, keep `languages/kuku-thaypan/` in Git
until this behaviour has been reviewed and merged.

For later admin publishing, an administrator will upload edited content, check
that the required text and image files are present, and publish a new version.
Users who already downloaded a module keep their offline copy until they choose
to install the update.
