# Database foundation

## Tables and relationships

- `organizers` stores organizer identity and contact details. Contact email is
  normalized to lowercase but is intentionally not unique.
- `tournament_submissions` stores the tournament proposal and its review
  lifecycle. Each row belongs to one organizer.
- `submission_events` is an append-only audit log for creation and future
  status changes. Events are deleted only when their parent submission is
  deleted.
- `admin_users` is the MVP admin registry. It has no `auth.users` foreign key
  until the authentication design is established.
- `submission_edit_tokens` stores SHA-256 capability-token hashes, expiry and
  consumption/revocation state. It never stores the raw organizer URL token.

No teams, matches, brackets, participants, rosters, or authentication ownership
columns are part of this foundation.

## Status lifecycle

The allowed values are `draft`, `submitted`, `needs_changes`, `approved`,
`published`, and `rejected`.

Allowed transitions:

```text
draft -> submitted
submitted -> needs_changes | approved | rejected
needs_changes -> submitted
approved -> published | needs_changes
published -> needs_changes
```

Every other transition, including a status to itself, is rejected by the domain
helper. Database checks also keep status values and lifecycle timestamps
consistent.

## RLS model

RLS is enabled for every table. The migration revokes direct table access from
`anon` and `authenticated` and creates no permissive policies. This closed
default prevents browser code from reading or mutating submissions before an
ownership model exists.

The service-role client is backend-only and bypasses RLS. Its key must never
enter a client component or browser bundle. Admin authorization remains a
separate application-level check against the configured allowlist and, later,
`admin_users`. Organizer-specific RLS policies will be introduced only after
magic-link authentication and organizer ownership are designed.

## Repository layer

All repositories import `server-only`, validate inputs with Zod, use the
service-role client, and convert database failures to `RepositoryError`.

- Organizers: `createOrganizer`, `getOrganizerById`
- Submissions: `createTournamentSubmission`,
  `getTournamentSubmissionById`, `listTournamentSubmissions`
- Events: `appendSubmissionEvent`, `listSubmissionEvents`

Submission lists accept status, organizer, start-date range, limit, and offset.
They sort by `created_at` descending, default to 50 rows, and cap the limit at 100. The event repository deliberately has no update or delete method.

## Atomic creation RPC

`create_tournament_submission_with_organizer(p_organizer, p_submission)`
creates the organizer, a submitted submission with `submitted_at = now()`, and
a `submission_submitted` event in one PostgreSQL transaction. The event records
the organizer actor and consent metadata. Any failure rolls back all three
writes. The `SECURITY DEFINER` function has a pinned search path and execution
is revoked from `public`, `anon`, and `authenticated`; only `service_role` can
invoke it.

`createTournamentSubmissionWithOrganizer` validates both payloads before making
the single RPC call. It adds the fixed consent version after the public Server
Action has validated the checkbox. No public HTTP endpoint exposes this
service.

## Functions, triggers, and indexes

`set_updated_at()` supplies `updated_at = now()` triggers for `organizers` and
`tournament_submissions`.

The migration creates only these indexes:

- `tournament_submissions(status)`
- `tournament_submissions(start_date)`
- `tournament_submissions(organizer_id)`
- `submission_events(submission_id, created_at)`
- `organizers(contact_email)`
- `submission_edit_tokens(submission_id, created_at desc)`
- one unresolved token per submission (partial unique index)

## Migration workflow

The migration sources are:

```text
supabase/migrations/20260731_create_organizer_portal_schema.sql
supabase/migrations/20260731_update_public_submission_rpc.sql
```

Local workflow:

```bash
supabase start
supabase db reset
supabase stop
```

Remote workflow:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

Do not commit the project reference, database password, access token, local env
file, Supabase temporary files, or Docker secrets.

## Type generation

The initial TypeScript database definitions are manually maintained bootstrap
types. Replace them with generated types after the project exists:

```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/lib/supabase/database.types.ts
```

Review the generated diff against migrations before committing it.

## Deliberately out of scope

This schema does not implement an admin UI, organizer dashboard, email or
Discord integration, authentication, ingestion export, AI extraction, teams,
rosters, matches, brackets, or live scoring.
