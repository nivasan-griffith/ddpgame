# Indigenous Languages administrator portal

This is a separate responsive Angular web application for administrators. It
does not add administrator pages to the learner application. Both applications
use the same Supabase project, so a code generated here is immediately usable
in the learner app.

## Current scope

- Supabase email/password administrator login
- list registered language modules and their public/private setting
- generate an access code with a label, 30-day default expiry, and usage limit
- list code status and redemption count without exposing the original code
- disable a code and revoke future private-file requests created with it

The actual readable code is displayed once after it is generated. Only a hash
is stored in Supabase, so the portal cannot reveal an old code later.

The public/private setting is intentionally read-only in this first version.
Changing a module from public to private does not transfer its files. Before a
module is marked private, its words, images, and audio must already be in the
private Storage bucket and excluded from the learner-app bundle. Full
word/media upload and publishing is the next phase of IND-88; that workflow
will change the content location and access setting together.

## One-time Supabase setup

1. Run `supabase/migrations/20260903090000_admin_portal.sql` in the Supabase
   SQL Editor (or apply it through the Supabase CLI in a managed environment).
2. In Supabase Dashboard, open **Authentication → Users** and create the first
   administrator email/password account. The password and chosen email can be
   decided with the client later.
3. In the SQL Editor, find that account's UUID:

   ```sql
   select id, email from auth.users order by created_at desc;
   ```

4. Register that Auth account as an administrator, replacing the values:

   ```sql
   insert into public.admin_users (user_id, display_name)
   values ('AUTH_USER_UUID_HERE', 'Administrator');
   ```

5. Deploy the protected endpoint:

   ```powershell
   npx supabase functions deploy admin-access-management --project-ref YOUR_PROJECT_REF
   ```

The SQL Editor is only needed for this initial setup and future database
migrations. Day-to-day code generation and disabling is performed in the
portal.

## Run locally

From this `admin-panel` folder:

```powershell
npm install
npm start
```

Open the local URL reported by Angular (normally `http://localhost:4200`). If
the learner app is already using that port, Angular will offer another port;
accept it.

## Security model

The browser receives only the Supabase project URL and publishable key. It
never receives a service-role key. Every portal request carries the signed-in
user session to the `admin-access-management` Edge Function. The function
checks that the user appears in `public.admin_users` before it reads or changes
module/code records with its server-only credentials.

Disabling a code prevents it from being redeemed again and revokes its stored
access grants for future private-file downloads. A module that was already
downloaded for offline use remains on that user's device; offline copies cannot
be remotely deleted by a web application.
