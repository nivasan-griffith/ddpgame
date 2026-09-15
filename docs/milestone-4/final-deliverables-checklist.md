# Final deliverables checklist

Use this checklist for IND-53. Check an item only when the linked evidence exists; repository preparation is not the same as submission or acceptance.

## Release candidate

- [ ] Final branch/PR is reviewed and all release-blocking feedback is resolved.
- [ ] Final commit SHA and release tag are recorded in `evidence-register.md`.
- [x] Learner production build passes from a clean install (`ebf8d2e`, 15 September 2026; see evidence register).
- [x] Administrator production build passes from a clean install (Node 22.22.1, 15 September 2026; see evidence register).
- [ ] Unit tests pass in a configured browser runner (local ChromeHeadless execution is currently blocked).
- [x] Language-data and static offline checks pass (6/6 at `ebf8d2e`).
- [ ] Browser/game regression evidence is complete for the supported matrix.
- [ ] Public/restricted access and code expiry/usage limits pass in the target environment.
- [ ] Offline-after-restart behavior is evidenced at the agreed browser/app/device level.
- [ ] Android and iOS are either tested to the agreed level or explicitly marked not required by the authorized stakeholder.
- [ ] No open release-blocking issue remains; accepted exceptions are documented and assigned.

## Documentation and evidence

- [ ] [Language cartridge specification](language-cartridge-specification.md) reviewed.
- [ ] [Project documentation](project-documentation.md) reviewed.
- [ ] [Evidence register](evidence-register.md) contains final commands, environments, PRs, Linear links, screenshots/logs, and outcomes.
- [ ] [Known limitations](known-limitations.md) reviewed with owners/dispositions.
- [ ] [Client demonstration script](client-demo-script.md) rehearsed against the release candidate.
- [ ] [Handover presentation](handover-presentation.md) converted to the delivery format and reviewed.
- [ ] [Source-code handover](source-code-handover.md) reviewed by the recipient.
- [ ] Root and admin-panel READMEs remain consistent with the released behavior.

## Client and operational handover

- [ ] Client demonstration completed; date, attendees, decisions, and evidence recorded.
- [ ] Handover presentation delivered; questions/actions recorded.
- [ ] Repository access transferred/confirmed.
- [ ] Recipient reproduced the agreed builds from the recorded commit.
- [ ] Hosting, Supabase, billing, deployment, signing/store, content approval, admin lifecycle, and support owners are named.
- [ ] Secrets were transferred only through the approved secret-management channel.
- [ ] Backend migration/function/Storage state was checked in the target environment.
- [ ] Backup/rollback procedure and data-retention decision were accepted.

## Submission

- [ ] Required submission format and destination confirmed.
- [ ] Source/release archive or repository reference included as required.
- [ ] Documentation/presentation/evidence files included as required.
- [ ] No credentials, private codes, grant tokens, or unapproved cultural/private content included.
- [ ] Final package opened/downloaded and spot-checked after upload.
- [ ] Submission receipt or immutable link captured.
- [ ] Client/course acceptance captured, or outstanding review status recorded accurately.
- [ ] Linear issues and Milestone 4 status updated to match the evidence—not anticipated completion.

## Final record

| Field | Value |
| --- | --- |
| Release commit/tag | Initial handover evidence commit `9b5fb33`; final merge SHA/tag pending |
| Release PR | `https://github.com/nivasan-griffith/ddpgame/pull/30` (review/merge pending) |
| Submission destination | Pending |
| Submitted by/date | Pending |
| Receipt/link | Pending |
| Client/course outcome | Pending |
| Open exceptions | Pending |
| Final Linear status updated by/date | Pending |
