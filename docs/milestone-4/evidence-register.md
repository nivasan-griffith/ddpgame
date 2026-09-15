# Milestone 4 evidence register

This register separates source evidence from executed acceptance evidence. It records the checks performed against `ebf8d2e` on 15 September 2026; replace remaining pending cells with durable links and exact results as checks occur.

## Evidence standard

Every executed check should record:

- date/time and tester;
- commit SHA and branch/PR;
- browser, OS, simulator/device, and viewport where relevant;
- backend environment (local/test/production) without credentials;
- exact command or steps;
- pass/fail result and defect link; and
- screenshot, log, PR check, or signed acceptance location.

`Repository contract` means the implementation or artifact exists in source. It is not an execution pass. `External gate` requires an action or decision outside this branch.

## Issue register

| Issue | Acceptance evidence required | Current repository evidence | State at preparation |
| --- | --- | --- | --- |
| IND-38 Browser testing | Supported-browser matrix covering selection, install, games, About, remove/update, and restricted routing. | Production learner build exercised in the Codex in-app Chromium browser: language update/select, Home, all three games, About, and a 390x844 viewport passed. Remove and restricted routing were not exercised. | Partial pass; remaining browser matrix pending. |
| IND-39 Android testing, if required | Approved Android scope; debug/release build and device/emulator results if required. | Capacitor project under `android/`; this branch corrects the Gradle wrapper executable bit. | Requirement decision and execution evidence pending. |
| IND-40 iOS testing, if required | Approved iOS scope; Xcode build and simulator/device results if required. | Capacitor project under `ios/`; `pod install` now succeeds and generated workspace metadata/lockfile are included in this branch. | Requirement decision and execution evidence pending. |
| IND-41 Game regression | Flip Card, Quiz, and Drag & Drop results for each available language, including narrow/mobile layout. | Flip Card, Quiz, and Drag & Drop were exercised with installed Kuku Yalanji content in Chromium; Drag & Drop was also exercised at 390x844. Component specs exist under `src/app/games/`. | Kuku Yalanji browser pass; Bininj/restricted-content and full browser matrix pending. |
| IND-42 Public/private access | Public install works; private content routes to code entry; private bucket cannot be read publicly; signed-path checks pass. | Catalogue/RPC/storage logic in learner, migrations, and Edge Function. | Deployed integration evidence pending. |
| IND-43 Offline after restart | Installed module and selection survive browser/app restart; all three games work with network disabled; removal clears the module. | After the static server was stopped, direct navigation to Home, Flip Card, Quiz, Drag & Drop, and About passed from the production service worker. A fresh browser tab also restored Home and the selected Kuku Yalanji module while the server remained down. | Web restart/offline pass; removal and packaged-app/device restart pending if required. |
| IND-44 Expiry and usage limits | Valid, invalid, inactive, expired, exhausted, and concurrent final-redemption cases. | Atomic SQL predicates and counter update in `20260824090000_unlock_private_modules.sql`; admin controls in Edge Function. | Deployed integration evidence pending. |
| IND-45 Major remaining issues | Triage list has no open release-blocking defects, or each exception is accepted. | Learner/admin builds and browser smoke passed; Android wrapper and iOS dependency-workspace reproducibility defects were corrected. Remaining release gates are the full browser/deployed-backend matrix, native platform decision/device builds, and review/merge of open PRs. | Final triage and exception acceptance pending. |
| IND-46 Cartridge specification | Reviewed, versioned cartridge contract. | [Language cartridge specification](language-cartridge-specification.md). | Repository deliverable prepared; review pending. |
| IND-47 Project documentation | Architecture, setup, data flow, testing, release and security boundaries. | [Project documentation](project-documentation.md). | Repository deliverable prepared; review pending. |
| IND-48 Collect evidence | Filled evidence register with PR, Linear, test and acceptance links. | This file records deterministic, build, browser/offline, source-audit, PR, and Linear evidence. | Repository evidence collected; external acceptance evidence pending. |
| IND-49 Known limitations | Reviewed limitation list with disposition/owner. | [Known limitations](known-limitations.md). | Repository deliverable prepared; stakeholder review pending. |
| IND-50 Client demonstration | Rehearsed demo and dated client outcome. | [Client demonstration script](client-demo-script.md). | External client event pending. |
| IND-51 Handover presentation | Reviewed deck/content and dated delivery outcome. | [Handover presentation](handover-presentation.md). | Presentation artifact prepared; delivery pending. |
| IND-52 Source-code handover | Recipient confirms repository access and can reproduce builds from a recorded SHA. | [Source-code handover](source-code-handover.md). | External recipient confirmation pending. |
| IND-53 Final submission | Submission receipt and client/course acceptance. | [Final deliverables checklist](final-deliverables-checklist.md). | External submission pending. |

## Command record

Paste or link concise results here; do not add credentials or full noisy logs.

| Check | Command | Commit/environment | Result | Evidence link |
| --- | --- | --- | --- | --- |
| Language data and offline static assets | `node --test scripts/language-data.test.mjs scripts/offline-static-assets.test.mjs` | `ebf8d2e`; Node 21.6.1; local macOS | **PASS**, 6/6 tests. | This execution record; CI attachment pending. |
| Learner unit tests | `npm test -- --watch=false --browsers=ChromeHeadless` | `ebf8d2e`; local macOS | **BLOCKED**: Chrome/Chromium executable is not installed for Karma. | Environment gap recorded; CI/browser runner pending. |
| Learner production build | `npm run build` after `npm ci` | `ebf8d2e`; Node 21.6.1; local macOS | **PASS**, exit 0; `www/index.html`, `ngsw-worker.js`, and `ngsw.json` produced. Node-engine and CSS-budget warnings were non-fatal. | This execution record; CI attachment pending. |
| Admin dependency install | `npm ci --no-audit --no-fund` from `admin-panel/` | `ebf8d2e`; Node 22.22.1; local macOS | **PASS**, exit 0. | This execution record; CI attachment pending. |
| Admin production build | `npm run build` from `admin-panel/` | `ebf8d2e`; Node 22.22.1; local macOS | **PASS**, exit 0; bundle hash `b3ffabb96d110961`. | This execution record; CI attachment pending. |
| Browser and game smoke | Production `www/` served locally; interactive navigation through selection/update, Home, Flip Card, Drag & Drop, Quiz, and About | `ebf8d2e`; Codex in-app Chromium; macOS; desktop and 390x844 viewport; Kuku Yalanji 1.0.3 | **PASS** for the exercised scope. Quiz correct-answer feedback and Drag & Drop check/feedback were observed. | Manual execution on 15 September 2026 by Nivasan/Codex; durable screenshot/CI evidence pending. |
| Offline restart smoke | Stop static server, reload/direct-navigate all learner routes, then open a fresh tab at `/home` | Same environment; server unavailable; production Angular service worker controlling the origin | **PASS**: all routes loaded offline and the selected installed module persisted in a fresh tab. | Manual execution on 15 September 2026 by Nivasan/Codex; packaged-app test pending if required. |
| Public/private source audit | Inspect learner service, Supabase migration, and private-download Edge Function | `ebf8d2e`; source only; no live Supabase access | **PASS** for fail-closed source contracts, expiry/max-redemption predicates, atomic redemption increment, and five-minute signed URLs. | Deployed integration, boundary, and concurrency tests pending. |
| Android build/sync | Wrapper/toolchain inspection; Gradle attempt capped before dependency download completed | Base `ebf8d2e`; no device/emulator; JDK 11 with AGP 8.2.1 | **PARTIAL FIX**: this branch records `android/gradlew` as executable. Build remains blocked pending platform requirement decision and a supported JDK/device. | External/native environment required. |
| iOS dependencies | `pod install` from `ios/App/` | Base `ebf8d2e`; CocoaPods; local macOS | **PASS**, 7/7 pods; this branch adds `Podfile.lock` and `App.xcworkspace/contents.xcworkspacedata`. | Generated Pods remain correctly ignored. |
| iOS simulator build | `xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build` | Base `ebf8d2e`; Xcode 15; no available simulator/device or installed iOS 17 platform | **BLOCKED**, exit 70: no eligible simulator destination/platform is installed. | Install the agreed iOS platform and run on an approved simulator/device if required. |

## Pull requests and Linear

| Item | URL | Scope/status |
| --- | --- | --- |
| Milestone 3 runtime Supabase configuration | `https://github.com/nivasan-griffith/ddpgame/pull/26` | Open dependency; configuration change only, with no live Supabase mutation performed by this Milestone 4 pass. |
| Language/content management | `https://github.com/nivasan-griffith/ddpgame/pull/28` | Open dependency; review and merge pending. |
| Admin portal restructure | `https://github.com/nivasan-griffith/ddpgame/pull/27` | Open dependency; review and merge pending. |
| Responsive Drag & Drop | `https://github.com/nivasan-griffith/ddpgame/pull/29` | Open dependency; review and merge pending. |
| Milestone 4 handover and acceptance pack | `https://github.com/nivasan-griffith/ddpgame/pull/30` | Open from `codex/m4-final-handover`; review and merge pending. Initial evidence commit: `9b5fb33`. |
| Milestone 4 Linear project | `https://linear.app/indigenous-project/project/milestone-4-final-handover-9f70e82ef2f9` | Update issue states only when supported by this register. |

## Acceptance record

| Gate | Approver | Date | Outcome/evidence |
| --- | --- | --- | --- |
| QA release recommendation | Pending | Pending | Pending |
| Client demonstration | Pending | Pending | Pending |
| Source-code recipient confirmation | Pending | Pending | Pending |
| Final submission receipt | Pending | Pending | Pending |
