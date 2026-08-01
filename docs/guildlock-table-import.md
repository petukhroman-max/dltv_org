# Guildlock XLSX and Google Sheets import

## Supported sources

- Server-side `.xlsx` upload, up to 10 MiB.
- A public, read-only Google Sheets URL in the exact `https://docs.google.com/spreadsheets/d/{id}` family. The server extracts a strictly validated spreadsheet ID and constructs its own XLSX export URL. Redirects, credentials, non-HTTPS URLs and foreign hosts are rejected. There is no Google OAuth.
- Guildlock v1 auto-detection and explicit custom sheet/header mapping. Custom mapping requires re-uploading the workbook; the raw upload is never retained.

The real supplied Guildlock workbook was inspected separately in [guildlock-import-analysis.md](./guildlock-import-analysis.md). Committed fixtures are generated with fictional data.

## Preview-first flow

The flow is Source → Parsing → Mapping → Validation → Preview → Conflict resolution → Confirmation → Report. Parsing never writes operational entities. It creates a short-lived session and validated normalized rows. Only an explicit confirmation calls the atomic apply RPC.

Organizer route: `/en|ru/workspace/[token]/import`. Admins use the same flow from `/admin/submissions/[id]/import`.

## Normalized model

The import contract is independent of database rows:

- `ImportedStage`
- `ImportedTeam`
- `ImportedPlayer`
- `ImportedRosterMember`
- `ImportedMatch`
- `ImportedBracketLink`
- `ImportedGroupAssignment`
- `TournamentImportBundle`

Every entity contains a source sheet, source row, stable source key, normalized data, warnings, errors, proposed action, optional existing entity ID and optional conflict resolution. Zod validates every payload before it is persisted. Private platform IDs may be used for server-side player matching but are redacted from preview, reports, audit metadata and public output. Real/full names are not imported.

## Guildlock v1 mapping

Guildlock detection combines characteristic sheets, merged structures and required headers; filenames are ignored. The adapter imports:

- the three qualifier/LAN stages;
- Day 1 group teams and standings assignments;
- teams, players, roles and captain markers from Rosters;
- safe match structure, Deadlock match IDs and explicit forfeits from match-info sheets.

It ignores example rows, picks/bans and Broadcast Talent. Visual bracket geometry, incomplete series scores and ambiguous winners are not guessed. They become warnings, invalid rows or conflicts. Bracket links are only accepted from an unambiguous normalized mapping.

## Matching and proposed actions

Team matching uses explicit source/external key, normalized exact name, then an unambiguous short name. Player matching uses a permitted platform/external ID, normalized display name and team context. Stage matching uses name or sequence/type. Match matching uses Deadlock ID, then stage/match number. Ambiguous candidates become `conflict`; they are never selected silently.

Rows are classified as `create`, `update`, `skip`, `conflict` or `invalid`. The preview exposes the proposed operation and source coordinates. Supported conflict decisions are use spreadsheet, keep existing, skip, link existing and create new. Completed results default to keep existing and require a separate high-risk confirmation before overwrite.

## Validation

Validation covers required fields, duplicate source keys/entities, unknown references, same-team matches, odd positive BO, non-negative scores, completed-result completeness, winner participation, URL protocols, dates/timezone warnings, roles, group consistency and bracket cycles. Blocking conflicts and invalid rows prevent apply.

## Atomic apply and idempotency

`apply_tournament_import_session` is a `SECURITY DEFINER` service-role-only RPC with a pinned search path. It validates the current admin/workspace actor, session/submission ownership, TTL, state and resolved conflicts, locks the session, and applies in dependency order: stages, teams, players, rosters, matches, group assignments, bracket links. PostgreSQL function execution is one transaction, so any exception rolls back all operational changes. A separate guarded failure RPC records a failed session after rollback.

The completed session cannot be applied again. A later upload of the same fingerprint is re-matched against current operational data and proposes skips/updates rather than duplicate creates. The import never deletes operational entities, removes roster history or cancels absent matches.

## Storage and RLS

`tournament_import_sessions` stores safe source metadata, detection/mapping/validation summaries, actor references and a 24-hour expiry. `tournament_import_rows` stores only normalized validated entity payloads. Both tables have RLS enabled, no anon/authenticated grants and service-role access only. Temporary rows are deleted after completion or cancellation. Raw workbooks, Google query parameters and raw workspace tokens are never stored.

## File security limits

- 10 MiB upload/download;
- 32 sheets, 10,000 meaningful rows, 128 columns, 4,096 characters per cell;
- 2,000 ZIP entries, 50 MiB uncompressed, compression ratio at most 100:1;
- 12-second Google download timeout and 15-second workbook processing deadline;
- ZIP path traversal, encryption, malformed archives, VBA and external workbook links rejected;
- formulas are not evaluated; formula-result cells are ignored;
- display/export values starting with `=`, `+`, `-` or `@` are prefixed safely.

## Audit and revalidation

Events include `import_uploaded`, `import_parsed`, `import_mapping_updated`, `import_validated`, `import_conflicts_resolved`, `import_started`, `import_completed`, `import_failed` and `import_cancelled`. Metadata is limited to session/source/template, counts, error/warning counts, a fingerprint prefix and `operational_version=v1`.

Successful apply revalidates organizer workspace, matches/import pages, admin submission details and both EN/RU public tournament projections. The public slug is resolved server-side and only published public entities are exposed.

## Manual smoke test (12 steps)

1. Open Import in an organizer workspace.
2. Upload the anonymized Guildlock XLSX.
3. Verify `guildlock_v1` detection and sheet list.
4. Check mapping/validation summary.
5. Filter invalid rows and inspect source coordinates.
6. Resolve one conflict.
7. Review create/update/skip counts.
8. Confirm the import.
9. Verify stages, teams and rosters.
10. Verify matches, bracket and standings pages.
11. Upload the same file again and verify skips/updates rather than duplicates.
12. Verify EN/RU and a 375px viewport.

## Known limitations

- Public Google Sheets must allow anonymous export; private sheets are unsupported.
- Custom mapping supports the documented team/player/match fields, not arbitrary ETL transformations.
- Guildlock picks/bans, player statistics and Broadcast Talent are out of scope.
- Guildlock visual bracket lines and incomplete series scores are not inferred.
- There is no scheduled sync, CSV, API import, webhooks or bidirectional sync.

The next stage is a separately reviewed Public API PR; no API or widgets are included here.
