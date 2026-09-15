# Milestone 4 final handover

This directory is the repository-native handover pack for Milestone 4. It maps the final-handover issues to durable project documentation while keeping repository evidence separate from external acceptance.

Prepared against repository revision `ebf8d2e` on 15 September 2026. Refresh the revision and evidence register before the final release if the implementation changes.

## Deliverables

| Linear issue | Repository deliverable |
| --- | --- |
| IND-46 | [Language cartridge specification](language-cartridge-specification.md) |
| IND-47 | [Project documentation](project-documentation.md) |
| IND-48 | [Evidence register](evidence-register.md) |
| IND-49 | [Known limitations](known-limitations.md) |
| IND-50 | [Client demonstration script](client-demo-script.md) |
| IND-51 | [Handover presentation](handover-presentation.md) |
| IND-52 | [Source-code handover](source-code-handover.md) |
| IND-53 | [Final deliverables checklist](final-deliverables-checklist.md) |

## Completion rule

Creating these files completes the repository-documentation portion of IND-46–53. It does **not** by itself prove that:

- browser or device tests passed;
- Supabase migrations, functions, buckets, or content were deployed;
- a pull request was reviewed or merged;
- a client demonstration or presentation occurred; or
- final deliverables were submitted and accepted.

Those events must be recorded in [the evidence register](evidence-register.md) with a date, environment, result, and durable evidence link. The final checklist deliberately leaves those human or external gates open.

## Handover order

1. Read the [project documentation](project-documentation.md) and [known limitations](known-limitations.md).
2. Run the verification commands in the [evidence register](evidence-register.md).
3. Follow the [source-code handover](source-code-handover.md) to reproduce the builds.
4. Rehearse the [client demonstration](client-demo-script.md) and [presentation](handover-presentation.md).
5. Complete and sign off the [final deliverables checklist](final-deliverables-checklist.md).
