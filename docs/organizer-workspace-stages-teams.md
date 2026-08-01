# Organizer Workspace: stages and teams

## Product goal

This release gives tournament organizers a focused operational workspace for
stages and teams without creating organizer accounts. It intentionally defers
rosters, players, matches, brackets, broadcast tooling, and public projection.

## Workspace flow

An authenticated administrator opens `/admin/submissions/[id]`, creates a
workspace link, copies the one-time plaintext URL, and sends it manually. The
organizer opens `/workspace/[token]` and can view and manage only the stages and
teams belonging to that token's submission. The workspace is available for
`submitted`, `needs_changes`, `approved`, and `published` submissions.

Operational changes are saved immediately and do not change the submission's
moderation status. Stages and teams are operational data and remain private
until the public projection layer is implemented.

## Edit token versus workspace token

The existing edit token is a single-use capability for correcting the
tournament overview after `needs_changes`; successful resubmission consumes it
and moves the submission back to `submitted`.

The workspace token is a separate, reusable capability for stage and team
management. It is scoped to one submission, expires, can be revoked or rotated,
and never changes moderation status.

## Token lifecycle and privacy

- Tokens contain 32 random bytes (256 bits) encoded as base64url.
- Only the deterministic SHA-256 hash is stored.
- The raw URL is returned once after creation and is never placed in an audit
  event.
- Expiration is selected server-side from 7, 30, or 90 days; 30 days is the
  default.
- Creating a new link transactionally revokes the previous unresolved link.
- Revoked and expired links return the same generic invalid-link message.
- The route is dynamic, `no-store`, `noindex`, `nofollow`, and uses
  `Referrer-Policy: no-referrer`.
- `anon` and `authenticated` have no direct table or RPC access.

## Authorization model

Shared mutation services accept a discriminated access context:

- admin: validated by `requireAdmin()`, with the admin user ID;
- organizer workspace: a server-validated token record ID and its submission
  ID.

The browser cannot select actor identity, event type, audit metadata, source,
slug, or trusted submission ownership. Service-role RPCs repeat authorization,
submission status, entity ownership, and workspace-token validity checks in the
same database transaction as each mutation and audit insert.

## Stage CRUD

Stage creation validates type, positive unique sequence, timezone-aware dates,
date ordering, optional IANA timezone, positive team count, and odd best-of.
The service creates a submission-scoped slug with a stable suffix on collision.
Rename preserves the existing slug. Sequence controls ordering; drag-and-drop
is not included.

Update and delete require `expected_updated_at`. A stale value returns a safe
conflict instead of overwriting another edit. Delete is blocked when matches
reference the stage.

## Team CRUD

Team creation validates the name, optional short name, safe HTTP(S) logo URL,
positive seed, status, and optional external ID. Source is always set
server-side to `manual`. Slugs are submission-scoped and preserved on rename.
Exact case-insensitive duplicate names are blocked; fuzzy matching is not used.

Update and delete use optimistic concurrency. Delete is blocked when matches or
roster members reference the team.

## Audit events

Token management emits `workspace_link_created`, `workspace_link_rotated`, and
`workspace_link_revoked`. Operational mutations emit `stage_created`,
`stage_updated`, `stage_deleted`, `team_created`, `team_updated`, and
`team_deleted`.

Metadata is allowlisted: entity ID/name for create/delete, changed field names
for update, operational version, and the workspace access/version marker when
applicable. No raw token, token hash, full URL, browser-supplied metadata, or
full before/after object is recorded.

## RLS and public projection

`organizer_workspace_tokens` and all operational tables have RLS enabled,
direct grants revoked from `anon` and `authenticated`, and no permissive
policies. Server-only repositories use the service role. Public tournament
pages continue reading only `published_tournaments`; stages and teams are not
added to that projection in this release.

## Manual UI test flow

1. Sign in to admin, open a submission, create a 30-day workspace link, and
   copy it.
2. Open the link in an incognito window and confirm the tournament name and
   status.
3. Create `Online Qualifiers` (Qualifier, sequence 1, BO3, online) and `LAN
Playoffs` (Double elimination, sequence 2, BO3, offline/location).
4. Rename the first stage, verify ordering, attempt duplicate sequence, and
   delete an unused stage.
5. Create `Team Alpha` seed 1 and `Team Beta` seed 2, rename Team Beta, verify
   ordering, attempt the exact duplicate name, and delete an unused team.
6. Refresh the workspace and confirm the data persists; open admin and confirm
   the same data is visible.
7. Revoke the link and confirm refresh returns the generic invalid-link state.
8. Generate a new link and confirm only the new link works.
9. Check layouts at 320 px and 375 px, then regress moderation, organizer
   resubmission, and the public catalog.

## Known limitations

There is no organizer account recovery or automatic link delivery. URL tokens
remain visible in browser history and should be sent through an appropriate
private channel. Local PostgreSQL integration tests require Docker/Supabase.
Public pages do not yet show stages or teams.

## Next steps

The next PR is Organizer Workspace Rosters CRUD: players, roster members,
captains, substitutes, and coaches. Match and bracket management remain later
work.
