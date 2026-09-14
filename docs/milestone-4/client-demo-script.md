# Client demonstration script

This is a repeatable 20–25 minute demonstration plan for IND-50. Run it against an approved, non-destructive environment and record the actual client outcome in `evidence-register.md`.

## Before the session

- Select the exact release commit and deployed learner/admin URLs.
- Confirm the release candidate passed the Milestone 4 checks.
- Use a clean browser profile for installation/access flows and keep a second pre-installed profile for offline recovery.
- Prepare one approved, unused restricted-module code in a test environment. Never put it in slides, source control, chat logs, or screenshots.
- Confirm the public and restricted modules, images, audio, and acknowledgements shown are approved for this audience.
- Disable notifications, close unrelated tabs, and prepare a backup screen recording or screenshots.
- Do not change a live module's access type as a demonstration unless the client explicitly approved that mutation and rollback.

## Run of show

### 1. Purpose and language ownership — 2 minutes

Explain that the learner provides shared game experiences while each language cartridge owns its words, media, theme, acknowledgements, version, and access classification. Emphasize that language and cultural content requires community/client approval before publication.

### 2. Public-module onboarding — 4 minutes

1. Open the learner's language-selection screen in the clean profile.
2. Identify Kuku Thaypan as the public example.
3. Install it and point out download progress and version information.
4. Select it and confirm its themed home screen and About/acknowledgement content.

Expected outcome: the module downloads without a code, becomes selectable, and uses its own content/theme.

### 3. Shared games — 5 minutes

Open Flip Card, Quiz, and Drag & Drop. Demonstrate one complete interaction in each. Show that all games read from the selected cartridge rather than containing separate language-specific implementations.

Expected outcome: words/images belong to the active module, interactions complete, and the layout remains usable at the agreed desktop/mobile viewport.

### 4. Offline persistence and removal — 4 minutes

1. In the pre-installed profile, reload/restart once while online.
2. Switch network emulation off and restart/reload using the agreed acceptance method.
3. Open all three games and show installed media/content.
4. Return online, remove the downloaded module, and confirm it is no longer available offline.

State precisely whether this was a browser reload, browser restart, app restart, or device reboot. Do not call a browser reload a device-restart test.

### 5. Restricted access — 4 minutes

1. Select Bininj Kunwok (or an approved restricted test module).
2. Show routing to the access-code screen.
3. Demonstrate a rejected invalid code without exposing a real credential.
4. Enter the prepared valid test code privately, install the module, and show that it becomes usable.
5. Explain expiry, redemption limits, device-local grants, and the persistence of already downloaded offline copies.

Expected outcome: restricted Storage is not directly public; only an accepted module-specific code permits the protected download.

### 6. Administrator and handover overview — 4 minutes

Show the admin portal using an approved non-production/test account. Cover language listing, access-code status, permissions, and publishing controls. Prefer a read-only walkthrough; if a mutation is in scope, use a disposable test module/code and record it.

Show the `docs/milestone-4/` index, cartridge specification, known limitations, and final checklist.

### 7. Questions and acceptance — 2 minutes

Ask the client to confirm:

- the demonstrated scope and access behavior;
- which known limitations are accepted or require follow-up;
- the intended code/content administrators; and
- the recipient and location for source-code handover.

## Session record

| Field | Value |
| --- | --- |
| Date/time | Pending |
| Release commit/URL | Pending |
| Environment | Pending |
| Presenter | Pending |
| Client attendees | Pending |
| Demonstrated scenarios | Pending |
| Questions/decisions | Pending |
| Defects/follow-ups | Pending |
| Client outcome/evidence | Pending |
