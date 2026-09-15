# Handover presentation

Presentation outline and speaker notes for IND-51. Keep the delivered deck concise (about 10 slides / 15 minutes) and use only screenshots from the verified release environment.

## Slide 1 — Indigenous Languages learner and admin platform

**On slide:** Project name, client/team, handover date, release commit.

**Speaker note:** State that the commit and deployed environment shown today are the authoritative release candidate. Do not imply client acceptance before it is recorded.

## Slide 2 — What was delivered

**On slide:** Multi-language learner; Flip Card, Quiz, Drag & Drop; public/restricted cartridges; offline installation; administrator portal; Android/iOS Capacitor shells.

**Speaker note:** Distinguish implemented source from deployment and device validation. Point to the evidence register for verified results.

## Slide 3 — Cartridge architecture

**On slide:** `catalogue → manifest + words + media → shared games`; link to the cartridge specification.

**Speaker note:** A cartridge owns language content, version, theme and acknowledgements. The core games remain shared. Content publication requires language/community approval.

## Slide 4 — Learner journey

**On slide:** Select language → install/unlock → play → update/remove.

**Speaker note:** Public modules install directly. Restricted modules require a valid code before protected files can be downloaded.

## Slide 5 — Offline behavior

**On slide:** IndexedDB stores manifest, words and media; local storage remembers selection; service worker caches the app shell.

**Speaker note:** An installed copy is intentionally available offline. Be exact about whether browser restart or packaged-device restart was tested.

## Slide 6 — Access and security boundaries

**On slide:** Hashed access codes; expiry/usage checks; opaque device grant; five-minute signed URLs; server-only service key; admin authorization.

**Speaker note:** Revoking a code prevents future server access but cannot remotely erase a copy already downloaded for offline use.

## Slide 7 — Administration and publishing

**On slide:** Administrator roles, language assignments, code management, module publishing, audit record.

**Speaker note:** Publishing between public/private Storage is a consequential operation. It must run in an approved environment with backup and post-change validation.

## Slide 8 — Quality and evidence

**On slide:** Unit/data tests, production builds, browser regression, access matrix, offline checks, Android/iOS decision.

**Speaker note:** Insert only actual pass/fail evidence from `evidence-register.md`, including commit and environment. Do not present planned tests as passed.

## Slide 9 — Known limitations and next steps

**On slide:** Device/backend verification status; browser-local grants; offline-copy revocation boundary; content/media gaps; future multi-zone Drag & Drop.

**Speaker note:** Confirm the client's disposition for each release-relevant limitation and create a Linear follow-up where needed.

## Slide 10 — Ownership and handover acceptance

**On slide:** Repository recipient; deployment owner; content approver; administrator owner; support contact; final submission status.

**Speaker note:** Capture names and dates. Ask the recipient to reproduce the builds from the handover commit and confirm access without exchanging secrets in the deck.

## Delivery record

| Field | Value |
| --- | --- |
| Deck location | Pending |
| Release commit | Pending |
| Reviewers/date | Pending |
| Presented to/date | Pending |
| Decisions/actions | Pending |
| Acceptance evidence | Pending |
