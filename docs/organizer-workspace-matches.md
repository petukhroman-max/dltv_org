# Organizer Workspace: matches and schedule

The private Organizer Workspace and authenticated admin area share one match
application service. Both surfaces create and manage rows in the existing
`public.tournament_matches` table; this feature does not add a public match
projection or expose operational data to browser Supabase clients.

## Routes and views

- `/{locale}/workspace/[token]/matches` provides create, filtering, grouped
  list, and date-based schedule views.
- `/{locale}/workspace/[token]/matches/[matchId]` provides edit, lifecycle,
  result, walkover, cancellation, reopen, and guarded deletion controls.
- `/admin/submissions/[id]` embeds the same create/list components.
- `/admin/submissions/[id]/matches/[matchId]` embeds the same detail controls.

Organizer URLs keep the workspace token only in the URL. It is not rendered in
page headings, labels, metadata, audit events, or mutation payloads.

## Lifecycle and validation

Supported statuses are `draft`, `scheduled`, `live`, `completed`, `postponed`,
`cancelled`, and `walkover`. Domain schemas validate required schedule data,
odd `best_of` values, distinct participants, non-negative scores, non-draw
results, HTTP(S)-only links, and participant winners. Completed-match winners
are derived from scores on the server and in PostgreSQL, never trusted from a
browser field.

Ordinary transitions are explicit. Reopening completed, cancelled, or
walkover matches uses a separate explicit operation. Permanent deletion is
limited to drafts and unused scheduled matches; matches with operational
history remain auditable.

Schedule forms accept tournament-local date/time and an IANA timezone. The
server converts them to UTC before persistence. Reads derive the display
timezone from the stage, then the submission, with `UTC` as the final fallback.

## Concurrency, scope, and audit

Updates include `expected_updated_at`. Each mutation locks the row and returns
the stable `MATCH_STALE_UPDATE` application error when another write won the
race. Database triggers and RPCs enforce that stages, both teams, and winners
belong to the same submission.

Mutation RPCs use `SECURITY DEFINER` with a pinned search path, strict JSON
allowlists, and the existing trusted admin/workspace access assertion. Execute
is revoked from `public`, `anon`, and `authenticated` and granted only to
`service_role`. The browser cannot choose `source`; new matches are always
recorded as `manual`.

Every create, update, transition, result, cancellation, reopen, and deletion
appends an allowlisted `submission_events` entry. Organizer events record the
workspace access method without storing the raw token.

## Migration deployment

The feature migration is
`supabase/migrations/20260801190000_add_tournament_match_management.sql`.
Review and test it locally before applying it through the normal deployment
pipeline. Do not edit earlier applied migrations and do not apply this migration
to a remote project from a feature branch.

## Manual QA checklist

- Open EN and RU workspace match list/detail pages on desktop and mobile.
- Create a TBD draft, then edit and schedule it with a valid stage, time, and BO.
- Filter by stage, status, team, and date; switch list/schedule views.
- Start and postpone a match; enter a non-draw result from scheduled and live.
- Record a walkover with either participating team as winner.
- Confirm cancel/delete dialogs and verify protected deletions are rejected.
- Open the same match twice and verify the stale tab receives a conflict message.
- Repeat representative create/edit/result operations from the admin surface.
- Verify stream/VOD links open safely and no workspace token appears in content.
