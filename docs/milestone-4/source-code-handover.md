# Source-code handover

This runbook supports IND-52. Completion requires an identified recipient to confirm repository access and reproduce the agreed builds from a recorded commit.

## Handover inventory

- Learner Angular/Ionic source: `src/`, `angular.json`, `ngsw-config.json`
- Language source/reference cartridges: `languages/`
- Administrator Angular source: `admin-panel/`
- Supabase migrations/functions/guides: `supabase/`
- Capacitor configuration and shells: `capacitor.config.ts`, `android/`, `ios/`
- Test/support scripts: `scripts/`
- Final handover pack: `docs/milestone-4/`

Generated directories such as `node_modules/`, `www/`, Angular `dist/`, Gradle outputs, Xcode DerivedData, and local Supabase state are not source deliverables.

## Reproduce the learner

```sh
git clone https://github.com/nivasan-griffith/ddpgame.git
cd ddpgame
git checkout <release-tag-or-commit>
npm ci
node --test scripts/language-data.test.mjs
node --test scripts/offline-static-assets.test.mjs
npm test -- --watch=false --browsers=ChromeHeadless
npm run build -- --configuration production
```

Expected learner output: `www/`.

For local development:

```sh
npm start
```

## Reproduce the administrator portal

```sh
cd admin-panel
npm ci
npm run build -- --configuration production
```

Record the actual output directory reported by Angular and the command result in the evidence register.

## Mobile handoff

After producing `www/`, synchronize the agreed Capacitor platform using the repository's pinned Capacitor 6.1.1 CLI. The recipient must use an approved local SDK/Xcode/Android Studio environment and record the exact command and result; do not infer a device pass from a web build.

The application identity in `capacitor.config.ts` is:

- app ID: `au.com.inov8design.kukuthaypan`
- app name: `Kuku Thaypan`

Confirm signing identities, bundle/application identifiers, store credentials, minimum OS versions, and release ownership with the client before distributing a binary. None of those secrets belongs in Git.

## Backend handoff

The repository contains ordered SQL migrations and two Edge Functions. Before changing an environment:

1. Identify the exact Supabase project/environment and authorized operator.
2. Back up or otherwise establish a rollback point for database and Storage data.
3. Compare applied migrations/functions with the repository instead of assuming they match.
4. Review `supabase/IND-21-private-module-deployment.md`, `supabase/IND-26-public-module-storage.md`, and `supabase/IND-26-access-type-publishing.md`.
5. Apply only approved pending migrations in timestamp order.
6. Deploy the required Edge Functions and verify their auth settings from `supabase/config.toml`.
7. Validate catalogue, public/private Storage, code redemption, expiry/limits, admin authorization, and audit logging.
8. Record environment, operator, commit, commands, result, and rollback outcome without exposing secrets.

Do not delete old Storage content or checked-in language source merely because a new runtime path exists. Removal needs an explicit retention/rollback decision and verified backup.

## Configuration and secrets

- Learner server URL: `src/assets/config/app-config.json` (runtime asset).
- Learner publishable key: `src/environments/environment*.ts`.
- Admin server URL/publishable key: `admin-panel/src/environments/environment*.ts`.
- Edge Function service-role key: target Supabase environment only; never Git or browser code.
- Admin passwords, access codes, signing keys, grant tokens, CLI login tokens, and deployment credentials: transfer through the client's approved secret manager, not email, slides, issues, PRs, or this repository.

Publishable/anonymous client keys are not service-role secrets, but their safety depends on correct RLS and server authorization.

## Ownership record

| Responsibility | Named owner/recipient | Access confirmed | Notes |
| --- | --- | --- | --- |
| GitHub repository | Pending | Pending | Pending |
| Learner hosting | Pending | Pending | Pending |
| Supabase project/billing | Pending | Pending | Pending |
| Database/function deployment | Pending | Pending | Pending |
| Android signing/store | Pending | Pending | Pending |
| iOS signing/App Store Connect | Pending | Pending | Pending |
| Language/content approval | Pending | Pending | Pending |
| Administrator account lifecycle | Pending | Pending | Pending |
| Post-handover support | Pending | Pending | Pending |

## Recipient acceptance

The recipient should record:

- repository access confirmed;
- release tag/commit fetched;
- learner dependency install, tests, and production build result;
- admin dependency install and production build result;
- mobile/backend responsibilities accepted or explicitly out of scope;
- documentation and known limitations reviewed; and
- date, name, and durable evidence link.
