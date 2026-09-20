# Known limitations

This list records known product, operational, and verification boundaries visible in the repository at `ebf8d2e`. Review each item before release and assign any accepted follow-up in Linear.

## Release-impacting verification gaps

1. **Live backend state is not established by Git.** Migrations, functions, Storage buckets, catalogue rows, files, and administrator records have deployment guides, but their current state must be checked in the approved Supabase environment.
2. **Physical-device behavior is not yet evidenced here.** Android and iOS shells exist. Browser, build, emulator, device, background/foreground, application restart, and device reboot are different checks; record only what was actually performed.
3. **Client acceptance and final submission are external gates.** Scripts and checklists prepare those events but cannot substitute for a dated client/course outcome.

## Product and data limitations

- Restricted access is device/browser-local until user accounts are introduced. Clearing local storage removes the grant token from that browser.
- Once a restricted module is downloaded to IndexedDB, disabling its code or revoking a server grant cannot remotely delete the offline copy.
- Changing a previously public module to private prevents future public access but cannot retract copies already downloaded or cached.
- Signed private URLs last five minutes, but downloaded cartridge assets persist offline by design.
- Missing optional image/audio files are tolerated during installation. The module can install with unavailable media, so publication QA must detect omissions before release.
- The current learner code does not perform full runtime JSON-schema validation. Malformed or semantically incomplete cartridge data can fail at load time or reduce game content.
- The current data tests contain inventory-specific assertions for the two existing modules. A new module needs corresponding validation coverage.
- Bininj Kunwok contains 993 vocabulary records but only 28 are marked playable; 27 of those have images. The remainder are preserved as dictionary content, not current game content.
- Kuku Thaypan contains 63 playable records, 51 with images; 12 image-less records are not suitable for image-dependent rounds.
- Bininj Kunwok currently uses generic fallback artwork and has no language-specific About content in its manifest.
- Drag & Drop implements word/image matching. A single-image, multi-zone mode is not implemented.

## Configuration and operational limitations

- The learner's Supabase URL is runtime-configurable through `src/assets/config/app-config.json`, but its public publishable key remains compiled into the Angular environment files.
- The administrator portal currently compiles both Supabase URL and publishable key from `admin-panel/src/environments/`; switching its server requires rebuilding.
- There is no committed environment-promotion automation proving migrations and Edge Functions are synchronized across local/test/production.
- Administrator bootstrap still requires an authorized operator to create a Supabase Auth user and register the first `admin_users` record.
- Public/private publishing copies then removes Storage objects and can revoke grants. It needs backups, an approved target environment, and post-operation validation; do not test it against live languages casually.
- The learner service worker prefetches `assets/**`, while language cartridges are managed separately in IndexedDB. Storage quotas and eviction behavior vary by browser/OS and need target-device testing.

## Disposition template

For every limitation that remains at release, record:

| Field | Value |
| --- | --- |
| Limitation | Concise description |
| Impact | Who/what is affected |
| Decision | Fix, accept, defer, or remove from scope |
| Owner | Named person/team |
| Linear issue | URL/identifier |
| Target date | Date or `not scheduled` |
| Client informed | Date/evidence |
