# Project documentation

## Purpose and scope

`ddpgame` is an Ionic/Angular language-learning application with shared Flip Card, Quiz, and Drag & Drop games. Language content is delivered as cartridges so new languages can reuse the game code. The repository also contains a separate Angular administrator portal, Supabase migrations and Edge Functions, and Capacitor shells for Android and iOS.

The checked-in learner currently describes Kuku Thaypan as public and Bininj Kunwok as restricted. The live behavior depends on the deployed Supabase catalogue and Storage state; repository values do not prove production deployment.

## Component map

| Component | Repository path | Responsibility |
| --- | --- | --- |
| Learner application | `src/` | Language selection, access-code flow, three games, About content, theming, download/remove UX. |
| Cartridge source copies | `languages/` | Manifests, vocabulary, images, and audio for the two current languages. |
| Offline module store | `src/app/services/language-module.service.ts` | Catalogue resolution, public/private downloads, IndexedDB persistence, update detection, asset URL resolution. |
| Supabase client boundary | `src/app/services/supabase.service.ts` | Catalogue RPC, code redemption, grant storage, public URLs, protected file requests. |
| Runtime learner configuration | `src/assets/config/app-config.json` | Supabase server URL loaded before Angular bootstraps. |
| Administrator portal | `admin-panel/` | Authenticated language, access-code, permissions, and publishing workflows implemented by the current code. |
| Database contract | `supabase/migrations/` | Module metadata, access codes/grants, admin roles, buckets, and access-change audit records. |
| Protected backend operations | `supabase/functions/` | Private signed URLs and authenticated administrator actions. |
| Mobile shells | `android/`, `ios/` | Capacitor Android and iOS projects using web output from `www/`. |
| PWA/offline shell | `ngsw-config.json` | Production service worker prefetches the application shell and shared `assets/**`. |

## Learner data flow

1. `AppConfigService` fetches `assets/config/app-config.json` with `no-store` before application startup.
2. `SupabaseService` creates a client with that server URL and the public publishable key.
3. `LanguageModuleService` calls `get_language_module_catalog` for safe module metadata.
4. Public content is read from its public Storage bucket. Restricted content requires a valid module grant and signed URLs from `private-module-download`.
5. Installing a module downloads its manifest, vocabulary, and referenced media into IndexedDB.
6. Games receive only entries with `playable === true`; missing optional media resolves to `null`.
7. The selected module persists in local storage. An installed module can be restored after reload and used without a network connection.

## Access-control model

- `language_modules` records access type and Storage location.
- `access_codes` stores hashes, active state, expiry, limits, and redemption count; the readable code is not recoverable later.
- `redeem_module_access_code` atomically validates a restricted code, increments redemption count, and returns an opaque grant token.
- `module_access_grants` stores only a hash of the browser's grant token.
- `private-module-download` verifies the grant, module, expiry, and path prefix before returning five-minute signed URLs.
- The administrator Edge Function requires a Supabase Auth session and an `admin_users` record. System and language-administrator authorization is enforced server-side.
- The service-role key belongs only in the Edge Function environment. Browser code contains a publishable key.

RLS and function grants are defined in `supabase/migrations/`. Their presence in Git does not prove they have been applied to any environment.

## Local development

Prerequisites: a current Node.js/npm installation, Chrome/Chromium for browser tests, and platform toolchains only when Android/iOS builds are required.

Learner application:

```sh
npm ci
npm start
```

Production learner build:

```sh
npm run build -- --configuration production
```

The learner output directory is `www/`. Production enables `ngsw-worker.js` through `ngsw-config.json`.

Administrator portal:

```sh
cd admin-panel
npm ci
npm start
```

Production admin build:

```sh
cd admin-panel
npm run build -- --configuration production
```

## Verification

Run the deterministic data and service-worker checks:

```sh
node --test scripts/language-data.test.mjs
node --test scripts/offline-static-assets.test.mjs
```

Run the Angular unit suite once with a local Chrome-compatible browser:

```sh
npm test -- --watch=false --browsers=ChromeHeadless
```

The repository also contains `scripts/offline-smoke.cjs` and `scripts/remove-module-smoke.cjs`. They are Chrome DevTools Protocol harnesses and expect the learner dev server plus a separately launched debug browser on ports documented inside each script. Record actual results in `evidence-register.md`; do not treat the existence of a script as a pass.

## Build and deployment boundaries

- Changing `src/assets/config/app-config.json` redirects the learner's Supabase server without recompiling its JavaScript bundles, but a deployment still must publish the edited asset.
- The admin portal's Supabase URL is currently compiled from `admin-panel/src/environments/` and needs a rebuild to change environments.
- Database migrations and Edge Function deployment are separate, explicit operations. Follow the guides under `supabase/` and use the correct approved project reference.
- Do not use a shared/production language solely to test public/private publishing: the operation copies and removes Storage objects and can revoke grants.
- Never commit service-role keys, administrator passwords, access codes, or private grant tokens.

## Change and release workflow

1. Create a feature branch from the current `main`.
2. Implement and test the smallest coherent change.
3. Attach command output, screenshots, and limitations to the matching Linear issue.
4. Open a pull request and obtain review before merge.
5. Apply approved backend/deployment changes in the target environment and record who performed them.
6. Re-run acceptance checks against the deployed release, tag the release commit, and update the evidence register.

See [source-code handover](source-code-handover.md) for the reproducible handoff procedure and [known limitations](known-limitations.md) for open risks.
