# Public tournament operational projection

## Product goal

The public tournament page closes the organizer-to-viewer loop: changes to
stages, teams, active rosters, schedule, match state, and results become a safe
read-only public view after the tournament is published. It does not add public
writes, standings, brackets, imports, polling, or standalone team/player pages.

## Published boundary

`published_tournaments` is the first and authoritative public boundary. The
orchestration service resolves a visible `published` row by its validated slug.
Only then may it use the related submission ID inside server-only code. A
submission UUID is never accepted by a public route. Hiding the published row
makes the route return 404 and prevents all operational reads; republishing the
same submission restores its stable slug without copying operational entities.

## Projection architecture

`getPublicTournamentProjection(slug, locale)` coordinates four bounded,
parallel server-side reads: stages, teams, active roster memberships with safe
players, and matches. Repositories use the service-role client in a
`server-only` module and explicit column selections. The browser never reads
operational tables. Exhaustive mappers produce dedicated public types; database
rows and object spreads are not returned to the page.

No database change is required. Existing indexes support submission-scoped
reads, operational RLS remains private by default, and no anon/authenticated
operational policy was added or weakened.

## Public read models and visibility

Stages expose only name, slug, type, sequence, dates, timezone, format, default
best-of, team count, location mode/name, and status. They require
`is_public = true` and are ordered by sequence and slug.

Teams expose only name, short name, slug, sanitized logo URL, region, seed,
status, and their safe roster. They require `is_public = true`. Logo, stream,
and VOD URLs must parse as HTTP or HTTPS; otherwise the UI uses a fallback or
omits the link.

Players expose only display name, country code, roster role, and captain flag.
Membership must be active, the player must be public, and the role must be one
of player, substitute, coach, or manager. Real names, platform IDs, external
IDs, normalized names, player/membership UUIDs, dates, sources, audit data, and
inactive members are excluded before serialization. Rosters are grouped as
Captain, Players, Substitutes, Coaches, and Managers, omitting empty groups.

Matches expose a human-readable label, safe stage/team summaries, round/group,
schedule and explicit timezone, best-of, score, status, participant winner,
safe stream/VOD links, positive duration, and the Deadlock reference only for
live/completed matches. Raw UUIDs, submission IDs, sources, update timestamps,
and audit metadata are never public.

## Status, TBD, and legacy-data behavior

The explicit status allowlist is scheduled, live, completed, postponed,
cancelled, and walkover. Draft and unknown states are hidden. Live is shown
first; scheduled/postponed and safe cancelled matches are upcoming in ascending
time; completed/walkover results are descending; unscheduled matches are last.
Ordering falls back to stage sequence, match number, and public label.

Missing or private teams render as localized TBD and never create a fake team.
A missing/private stage renders as Other. A winner that is not a participant is
removed. Completed matches with incomplete or invalid scores are not published
as results. Partial/negative scores, invalid dates, unsafe URLs, malformed
logos, and non-positive durations are sanitized. Safe warning codes are logged
server-side without IDs, names, row data, or other private payload. Database
data is never repaired automatically.

## Caching and revalidation

The projection has a 60-second cache lifetime. After a successful stage, team,
roster, or match mutation, server code resolves the currently published slug
from the trusted submission relation. Published tournaments invalidate the
projection tag and both `/en/tournaments/[slug]` and
`/ru/tournaments/[slug]`; unpublished submissions do not trigger public
invalidation. Browser-provided slugs are never trusted.

## EN/RU and UX

Navigation, sections, stage types, entity and match statuses, roles, TBD,
labels, empty states, dates, duration, links, and accessibility text are
localized. Dates use the existing locale formatter with the explicitly shown
tournament/stage timezone. Duration uses compact localized hours and minutes.
The page uses compact cards, visible anchor navigation, wrapping long names,
single-column mobile grids, and no page-level horizontal scrolling.

Workspace `is_public` controls explain that public items appear only after the
tournament is published. This does not introduce a new moderation step.

## SEO

The existing slug page provides localized title and fallback description,
canonical URL, EN/RU alternates, Open Graph locale data, and conservative
SportsEvent JSON-LD using tournament name, dates, organizer, URL, and a known
virtual/region location. Private operational data is excluded. Missing or
unavailable metadata states are `noindex`.

## Performance

Operational data is loaded with four parallel submission-scoped queries. There
is no per-team roster query, materialized view, live polling, or added index.

## Manual smoke-test (no SQL)

1. Publish a tournament that already has public and private operational data.
2. Open its Russian public slug page and verify Overview counts.
3. Verify stage order, translated type/status, dates, and location.
4. Verify upcoming schedule date, time, timezone, BO, and stream link.
5. Verify a completed score, winner, duration, and VOD link.
6. Verify a live match is visually distinct and a missing team renders TBD.
7. Verify team cards, role-grouped active rosters, empty roster copy, and logo fallback.
8. Confirm real names, platform/external IDs, UUIDs, private entities, inactive members, and draft matches are absent.
9. Change a match in the organizer workspace and refresh the public page.
10. Switch RU/EN while on a section and verify the slug/section is preserved.
11. At 375 px, verify navigation, wrapped team names, scores, rosters, and no page-level horizontal scroll.
12. Move the tournament to the state that hides publication, verify 404, then republish and verify the same slug/data returns.

## Verification and known limitations

Unit, component, service, static security, revalidation, SEO, and existing
regression tests cover the projection. A populated live-database integration
run requires local Supabase/Docker and must not be reported as successful when
that environment is unavailable. The connected environment used during this
PR had no published fixture, so no remote data was seeded for browser QA.

External mutations that bypass the covered admin/organizer actions may remain
cached for up to 60 seconds. A correction CTA is deferred because the product
currently has no verified feedback/contact destination.

## Next step

The next independent scope may add a repeatable local Supabase integration
fixture and end-to-end publication/hide/republish coverage. Brackets,
standings, imports, live polling, public writes, and standalone entity pages
remain separate product decisions.
