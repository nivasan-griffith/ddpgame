# Indigenous Language Learning application

This repository contains a Griffith University Work Integrated Learning (WIL)
project for learning Indigenous languages through images, text and audio. It
includes:

- an Angular/Ionic learner application that can run in a browser or Capacitor
  native shell;
- downloadable language modules with optional theme metadata;
- offline module storage in IndexedDB;
- a separate Angular Admin Portal; and
- Supabase database, Storage and Edge Function resources.

The learner application is deliberately language-agnostic. Language content
belongs to a module rather than to a separate copy of each game. Community
permissions and access restrictions must be respected when handling module
content.

## Current language modules

| Module | Access | Current content notes |
| --- | --- | --- |
| Kuku Thaypan | Public | Flip Card, Quiz, Mix & Match and a valid region-based Drag & Drop scene; language-specific About content and theme |
| Bininj Kunwok | Restricted | Flip Card, Quiz and Mix & Match; no valid region group, so Drag & Drop is hidden; neutral About fallback |

Access type and availability ultimately come from the Supabase language-module
catalogue. The checked-in files under `languages/` are the source/reference
copies used by builds and content checks.

## Technology

- Angular 18 and TypeScript
- Ionic 8
- Capacitor 6 (iOS and Android projects are present)
- Supabase (`@supabase/supabase-js`, PostgreSQL, Storage and Edge Functions)
- IndexedDB and `localStorage`
- Angular service worker for the production app shell and shared UI assets

## Architecture

### Language modules

Each module is stored under `languages/<module-id>/` and is described by a
`manifest.json`. The manifest identifies the module, version, data file, access
type, available games and optional theme/About metadata. Its `data` property
currently points to `words.json`.

A word entry can contain:

- stable `id`, language `word` and English translation;
- `playable` and source/availability metadata;
- a module-relative image path;
- module-relative language and English audio paths;
- optional Quiz `displayScale`; and
- optional percentage-based `region` metadata for single-image Drag & Drop.

Image and audio URLs are resolved by `LanguageModuleService`. The service
exposes only entries with `playable: true` to the games, while retaining the
full word inventory for module consumers that need it.

Theme metadata supplies colour tokens and may supply hero, trim, navigation,
bullet and result artwork. Missing values are filled from the application's
default theme, so a module that requires fully language-specific artwork should
provide a complete asset set.

### Runtime flow

1. The learner reads the safe module catalogue from Supabase.
2. The user downloads a public module or redeems access to a restricted one.
3. The manifest, word data and referenced word media are stored in IndexedDB.
4. The selected module ID is stored in `localStorage`.
5. Shared pages load the selected module and apply its manifest theme.
6. When offline, an installed module is loaded from IndexedDB and media blobs
   are exposed through local object URLs.

The production service worker caches the Angular app shell and shared
`/assets/**`. Downloaded language modules are intentionally managed by
IndexedDB rather than by the service worker.

### Supabase integration

The learner uses Supabase for:

- the safe language-module catalogue;
- public module URLs;
- restricted access-code redemption;
- short-lived access to private module files; and
- public/private Storage locations.

The Admin Portal uses Supabase Auth and the protected
`admin-access-management` Edge Function. The service-role credential remains
server-side; it must never be placed in either browser application.

## Learner application

### Language selection and downloads

- Public modules can be downloaded directly before use.
- Installing a restricted module requires either a valid stored grant or
  successful access-code redemption. Successful redemption stores a local
  grant, downloads the module and selects it.
- Installed and current remote version strings are compared for inequality. A
  different remote version is offered for download without first deleting the
  offline copy; this is not a semantic newer-version comparison.
- If the catalogue cannot be reached, installed modules remain listed and
  usable, but their latest remote version is unknown.

### Offline use and switching

Downloaded module data and word media are read from IndexedDB when the network
is unavailable. Language-aware pages reload the currently selected module when
they are re-entered, preventing content from a previously selected language
from remaining on screen.

### Removing a module

Removal deletes the module record and its stored blobs from IndexedDB, revokes
generated object URLs, and clears the saved selection if that language was
active. A removed module must be downloaded again before offline use.

## Learning games

All games use shared Angular components and the selected module's playable word
data.

### Flip Card

Displays an image and its language/English text, with flip navigation and audio
where recordings are available. Region-based scene labels are excluded.

### Quiz

Shows an image with multiple language-word choices and available audio. Images
render inside a shared responsive slot; the optional data-level `displayScale`
is available for exceptional transparent-canvas assets without adding
language- or filename-specific CSS. Region-based scene labels are excluded.

### Mix & Match

Presents up to four image targets and an independently shuffled word bank. Players
can use drag or tap interactions. Words containing `region` metadata are
explicitly excluded so shared-scene artwork such as Kuku Thaypan's
`face-head.png` cannot enter a Mix & Match round.

### Region-based Drag & Drop

The Drag & Drop route supports two modes:

- **single-image/multi-region mode** when valid region content exists; and
- a four-image matching fallback using playable image-backed words when it does
  not. This fallback is separate from the dedicated Mix & Match route and does
  not apply its region-word exclusion.

Region metadata is stored directly on existing word entries:

```json
{
  "region": {
    "shapeId": "scene",
    "x": 10,
    "y": 20,
    "width": 15,
    "height": 12
  }
}
```

`x`, `y`, `width` and `height` are percentages of the displayed image. A valid
region must have finite, positive dimensions and remain within the 0–100 image
bounds. Words are grouped by their resolved shared image, and a group requires
at least two valid region words. A round shuffles the group and selects up to
four targets, rejecting candidates whose centre is less than 20% of the image
dimensions from an already selected target. The resulting round can therefore
contain fewer targets than the source group.

Kuku Thaypan currently provides one valid shared-image group using
`face-head.png`. Bininj Kunwok currently provides no valid region group, so the
Home menu hides Drag & Drop generically while retaining Mix & Match. Adding a
valid group to a future module makes the menu capability available without a
hard-coded language ID.

## Admin Portal

`admin-panel/` is a separate Angular application. It shares the Supabase
backend but is not embedded in the learner application.

| Role | Current permissions |
| --- | --- |
| System Administrator | View all modules; create an empty private module scaffold or delete a language; manage administrators and assignments; manage words and access codes; publish public/private access changes |
| Language Administrator | View assigned modules; edit their name and words; manage their access codes; access type is read-only; cannot create/delete languages, manage administrators or publish access-type changes |

The portal validates manifest/word content, preserves unrecognised word
metadata, uses optimistic version checks and increments the manifest patch
version when language content is saved. Media paths must already refer to safe,
module-relative Storage objects; uploading new media is currently a separate
Storage operation.

See [`admin-panel/README.md`](admin-panel/README.md) and the documents under
`supabase/` for setup, security and publishing details.

## Runtime and server configuration

Both applications load the Supabase base URL before Angular starts:

- learner: `src/assets/config/app-config.json`
- Admin Portal: `admin-panel/src/assets/config/app-config.json`

```json
{
  "serverUrl": "https://your-supabase-server.example.com"
}
```

`serverUrl` is fetched with `cache: no-store`, trimmed and validated. For a
deployed web build, the copied `assets/config/app-config.json` can therefore be
changed without rewriting application code or rebuilding the Angular bundle.
A packaged Capacitor app must be rebuilt, resynchronised and redistributed to
ship a changed bundled configuration. The runtime setting supports hosted or
self-hosted Supabase endpoints.

The public Supabase publishable key remains in the relevant Angular environment
file and must match the configured server. Moving to a different project/key
pair requires updating that non-secret publishable key and rebuilding. Never
store service-role keys, passwords or access codes in source control.

## Development setup

Prerequisites are a supported Node.js/npm installation and, for native iOS
work, macOS with Xcode and CocoaPods.

### Learner application

```bash
npm ci
npm start
```

Angular reports the local URL, normally `http://localhost:4200`.

Create a production build in `www/`:

```bash
npm run build
```

### Admin Portal

```bash
cd admin-panel
npm ci
npm start
```

Build the portal with:

```bash
cd admin-panel
npm run build
```

### Capacitor / iOS

Always build the learner before copying web assets into the native project:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Build and run the `App` target from Xcode. `npx cap sync ios` updates generated
native web assets and plugin metadata; review generated native changes before
including any of them in a pull request. A stale Simulator installation or an
unsynchronised `ios/App/App/public` directory can otherwise show an older web
build.

The equivalent Android platform is present and can be synchronised with
`npx cap sync android`, but broad native Android/physical-device validation is
not recorded as complete for this handover.

## Testing and QA

### Automated checks

Run learner Jasmine/Karma tests once:

```bash
npm test -- --watch=false
```

At handover, this command executes 74 specs but has two stale test failures:
the language-selection update assertion does not account for the download
progress callback, and a language-module service test mock does not implement
the current catalogue API. The application production build still succeeds;
update these tests before treating the full learner suite as a release gate.

Run the checked-in language inventory and service-worker contract tests:

```bash
node --test scripts/language-data.test.mjs
node --test scripts/offline-static-assets.test.mjs
```

At handover, the service-worker test passes. The language-data test has two
stale Kuku Thaypan count assertions from before the region-word additions
(`availableInCurrentVersion` and image-backed counts), so it must be updated to
separate ordinary game cards from region entries.

Run Admin Portal tests and the shared language-content contract:

```bash
cd admin-panel
npm test -- --watch=false
npm run test:content-contract
```

For release candidates, build both applications and check the diff:

```bash
npm run build
(cd admin-panel && npm run build)
git diff --check
```

The learner production build generates the Angular service worker files. The
content-contract test validates manifests and words against the same parsing
rules used by the Admin Edge Function.

### Manual regression checks

Automated component tests do not replace end-to-end checks. Before release,
verify at least:

- public and restricted download/access-code flows;
- offline launch and play after installing each module;
- Kuku Thaypan → Bininj Kunwok → Kuku Thaypan switching;
- module update and removal;
- all games with both drag and tap interaction where applicable;
- desktop, tablet, portrait and short-landscape browser layouts;
- iOS Simulator after a fresh Capacitor sync; and
- screen-reader names, keyboard focus and external About links.

The repository contains `scripts/offline-smoke.cjs` for a Chrome DevTools
Protocol-assisted offline smoke run, but it requires a separately started
debug browser and local application server; it is not an npm-script test.

Native Android and broad physical-device coverage have not been established by
the checked-in automated suite and should be reported separately from browser
or iOS Simulator QA.

## Repository structure

| Path | Purpose / maintainer guidance |
| --- | --- |
| `src/app/` | Learner pages, games, guards and shared services |
| `src/app/services/language-module.service.ts` | Module catalogue, install/remove, IndexedDB resolution and shared content types |
| `src/assets/` | Shared UI assets, fonts, logos, artists and runtime configuration; do not place restricted module media here |
| `src/theme/` | Shared Ionic/theme and responsive styles |
| `languages/` | Checked-in manifests, word data and language-owned media; preserve module-relative paths and permissions |
| `admin-panel/` | Separate administrator Angular application and content-contract test |
| `supabase/functions/` | Private-download and administrator Edge Functions plus shared content validation |
| `supabase/migrations/` | Database/RPC/RLS evolution; apply in filename order to a new environment |
| `scripts/` | Learner content, service-worker and offline smoke checks |
| `ios/`, `android/` | Capacitor native projects; generated web assets are copied by `cap sync` |
| `ngsw-config.json` | Production app-shell/shared-asset service-worker policy |
| `www/` | Generated learner production build; do not edit by hand |

When adding or editing community content, change the owning language module and
use the Admin/content validation path. Do not copy restricted content into
tests, documentation, shared assets or issue screenshots.

## Known limitations and handover notes

- A private-module access grant is stored in the local browser rather than
  being attached to a learner account.
- Making a module private, disabling an access code or removing a server-side
  grant cannot remotely delete an offline copy already downloaded to a device.
- Admin word editing accepts existing safe media paths, but new media upload is
  still a separate Storage operation.
- Bininj Kunwok has no supplied language-specific About content and intentionally
  displays the neutral fallback.
- Bininj Kunwok has no valid shared-image region group, so region-based Drag &
  Drop is intentionally hidden.
- Production validation against a self-hosted Supabase/VPS is not documented as
  complete.
- Native Android and broader physical-device validation are not documented as
  complete; browser testing and iOS Simulator testing should not be presented
  as equivalent coverage.
- The applications have not been prepared in this repository as completed App
  Store or Google Play releases.
- The full learner test command currently reports 72/74 passing because two
  specs have stale expectations/mocks, and the language-data script reports
  2/4 passing because two Kuku count assertions predate the region dataset.

## Future development opportunities

These are opportunities, not current features:

- validate region-based Drag & Drop with multiple shared-image dummy datasets;
- add an optional placement-hint toggle;
- add proximity snapping for Drag & Drop;
- expose additional configurable game settings;
- show module download progress as MB downloaded / total MB;
- collect privacy-appropriate download statistics per language;
- optimise module media further for low-bandwidth environments;
- extend the existing empty-module creation flow into complete browser-based
  content and media authoring;
- complete native Android and broader physical-device testing;
- validate a production self-hosted Supabase/VPS deployment; and
- complete App Store and Google Play publication work.

## Contribution and handover workflow

Use a feature branch and pull request. Keep application changes scoped, run the
relevant focused tests plus production builds, and record automated evidence
separately from manual QA. Do not commit credentials, generated local IDE files
or unrelated workspace changes.
