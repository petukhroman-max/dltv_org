# Public tournament catalog

## Public read model

Workflow submissions remain private moderation records. Public pages read the
separate `published_tournaments` projection, which contains only approved
display fields. This separation prevents organizer contact details, reviewer
notes, internal organizer notes, audit metadata, and token data from entering
the public layer. Future APIs and widgets should read this table rather than
`tournament_submissions`; no CQRS framework is introduced.

## Projection lifecycle

The moderation RPC owns projection writes in the same PostgreSQL transaction
as the status update and audit event:

- `approved → published` creates the projection and a stable slug;
- republishing updates the existing row by `submission_id`, preserving its ID
  and slug while refreshing public fields and `published_at`;
- `published → needs_changes` sets `visibility_status = hidden` without
  deleting the row;
- the next publish restores `visibility_status = published`;
- rejected submissions never receive a public projection.

Any projection failure rolls back the submission status and audit event.

## Slugs

Initial slugs use lowercase ASCII letters, numbers, and collapsed hyphens, are
trimmed to 100 characters, and fall back to `tournament`. A conflict adds a
short stable suffix derived from the submission UUID. Once created, a slug is
not changed automatically when the tournament name changes.

## Public and excluded fields

The projection includes tournament name/description, organizer organization
name, region/language, dates/timezone, format/prize pool, public HTTP(S) links,
online state, team limit, registration deadline, visibility, provenance
timestamps, and stable identifiers.

It excludes contact name/email, organizer Discord contact, reviewer notes and
identity, internal `organizer_notes`, audit metadata, and all edit-token data.

## RLS

RLS is enabled. `anon` and `authenticated` may select only rows whose
`visibility_status` is `published`. They cannot insert, update, or delete.
`organizers` and `tournament_submissions` remain closed. Projection writes use
the server-only service-role moderation RPC.

## Routes and lifecycle

- `/tournaments` provides lifecycle/region filters and server pagination with
  20 rows per page.
- `/tournaments/[slug]` displays the public projection and provenance.

Lifecycle uses the current UTC date: before `start_date` is upcoming, inclusive
start/end is ongoing, and after `end_date` is completed. Tournament timezone is
displayed but does not affect MVP midnight boundaries.

## SEO

The catalog and visible detail pages are indexable with canonical metadata.
Detail pages add basic Open Graph fields and conservative `SportsEvent` JSON-LD
using only confirmed projection data. The dynamic sitemap includes visible
tournaments only. Robots rules disallow admin, auth, edit-link, and submission
success routes while allowing the catalog.

## Manual checklist

1. Publish an approved submission and verify its public row and slug.
2. Open the catalog and detail page; confirm contact/moderation/internal fields
   are absent.
3. Request changes from a published submission and confirm the row becomes
   hidden and disappears from the catalog/detail/sitemap.
4. Resubmit, approve, and republish; confirm the row ID and slug remain stable
   while public fields refresh.
5. Exercise lifecycle/region filters, pagination, unknown slugs, external links,
   mobile layout, metadata, robots, and sitemap.

## Known limitations and future work

There are no images, matches, teams, brackets, scores, ratings, comments,
analytics, public API, or automatic import. Date lifecycle uses UTC boundaries.
A later stage may expose the same public read model through a versioned API and
widgets without widening access to workflow tables.
