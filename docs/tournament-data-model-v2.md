# Tournament operational data model v2

## 1. Product rationale

DLTV Organizer Portal currently manages a tournament announcement through its
submission, moderation, organizer-edit, publication, and public-catalog
lifecycle. Organizer Workspace needs structured operational data so schedules,
teams, rosters, and results can later power DLTV pages, an API, widgets, and
partner integrations.

## 2. Guildlock-derived requirements

Guildlock LAN uses separate main-info, qualification, group, bracket, match,
team, roster, result, Deadlock match-ID, picks/bans, and broadcast data. The v2
foundation deliberately models only stages, tournament-scoped teams, players,
roster membership, and matches. It does not attempt to reproduce the entire
spreadsheet.

## 3. Scope

This stage adds one additive migration, TypeScript validation/read models,
server-only read repositories, and a read-only admin preview. It does not add
organizer CRUD, a public API, public operational projections, bracket
automation, standings, prize distribution, picks/bans, or broadcast talent.

## 4. Entity relationship overview

```text
tournament_submissions
├── tournament_stages
├── tournament_teams
│   └── tournament_roster_members ── players
└── tournament_matches ── optional stage/team references
```

`tournament_submissions.id` remains the workflow root. This is an intentional
MVP bridge: after the organizer workflow is proven, a canonical tournament
entity can be separated from the submission workflow without prematurely
migrating existing data.

## 5. Tables and fields

- `tournament_stages`: scoped name/slug/type/order, time window, timezone,
  format, default best-of, team count, location, status, and visibility.
- `tournament_teams`: scoped name/slug, short name, logo, region, seed, status,
  external ID, source, and visibility.
- `players`: public IGN, normalized search name, private optional real name,
  country, optional platform/external IDs, source, and visibility.
- `tournament_roster_members`: team/player relationship, role, captain/active
  flags, and membership time window.
- `tournament_matches`: optional stage and TBD teams, schedule, round/group,
  best-of, scores, winner, status, Deadlock match ID, stream/VOD, duration,
  source, and visibility.

All entities use UUID primary keys and `created_at`/`updated_at`; the existing
`set_updated_at()` function supplies update triggers.

## 6. Status enums

- Stage: `scheduled`, `live`, `completed`, `cancelled`.
- Team: `invited`, `registered`, `confirmed`, `active`, `eliminated`,
  `withdrawn`, `disqualified`.
- Match: `draft`, `scheduled`, `live`, `completed`, `postponed`, `cancelled`,
  `walkover`.
- Source: `manual`, `import`, `api`.
- Roster role: `player`, `substitute`, `coach`, `manager`.

Database checks and Zod schemas constrain these values.

## 7. Privacy rules

Operational tables are private by default. `real_name` is an optional internal
field and is deliberately absent from the safe admin roster model and current
UI. Future public projections must explicitly allowlist player fields rather
than serializing database rows.

## 8. Cross-tournament integrity

Ordinary foreign keys provide lifecycle behavior (`cascade`, `restrict`, or
`set null`). A `BEFORE INSERT OR UPDATE` trigger validates that every match
stage, participant, and winner belongs to the match's `submission_id`. It raises
SQLSTATE `23514` for cross-tournament references. Database checks also enforce
participant/winner integrity and critical scheduled/live/completed/walkover
result invariants.

## 9. RLS model

RLS is enabled on all five tables. Direct `SELECT`, `INSERT`, `UPDATE`, and
`DELETE` privileges are revoked from `public`, `anon`, and `authenticated`.
There are no permissive policies. `service_role` is granted server-side table
access, and its key remains inside the existing `server-only` client module.
The public catalog continues to read only `published_tournaments`.

## 10. Why teams are tournament-scoped

Names are not reliable global identities. Tournament-scoped teams allow the
same name in different events and avoid premature entity resolution. A future
canonical team layer can link these entries after real import and organizer
workflows reveal stable identifiers.

## 11. Why players are separate

Roster membership is tournament/team-specific, while a player may appear in
many rosters. Players therefore have separate records and optional unique
platform IDs. Display and normalized names are intentionally not unique, and
no automatic merge is performed from names alone.

## 12. Why bracket automation is deferred

Stage, round, group, and match-number fields are enough for initial CRUD and
scheduling. Winner/loser graph edges, advancement, seeding algorithms, and
bracket generation require product validation and belong in a later model.

## 13. Why picks/bans are deferred

Picks/bans are not stored as arbitrary match JSON. A future normalized
`match_drafts` or `match_picks_bans` entity will follow analysis of the Deadlock
API and real match-ID payloads.

Broadcast talent and prize distribution are also deferred. Existing
`prize_pool_text` remains the tournament-overview field.

## 14. Compatibility with existing submissions

The migration is additive: it does not alter or backfill existing submissions,
moderation events/RPCs, edit tokens, published projections, or public routes.
The five new tables start empty, and existing tournament fields are not parsed
into stages or matches.

## 15. Future Organizer Workspace

The next PR should add organizer-authorized server actions/RPCs and CRUD UI for
stages and tournament teams only. Existing edit capability tokens do not gain
automatic access to operational entities; authorization must be designed
explicitly.

## 16. Future public API

A public API should read a dedicated allowlisted projection, not these private
operational tables. Versioning, caching, rate limits, and publication state are
outside this PR.

## 17. Future widgets

Schedules, rosters, and results can later feed embeddable and partner widgets
from the same public projection. Widgets must not receive private names,
internal IDs, unpublished rows, or service-role access.

## 18. Migration checklist

1. Review `20260801050000_add_tournament_operational_data_model.sql`.
2. Run `npx supabase db push --dry-run` against the intended linked project.
3. Confirm exactly five new empty tables, RLS, revokes/grants, indexes, and
   triggers.
4. Apply the migration only with explicit deployment authorization.
5. Verify existing moderation, organizer edit, catalog, and public pages.
6. Insert a temporary submission-scoped fixture and confirm cross-tournament
   match references fail, submission deletion cascades, and roster membership
   restricts player deletion; then remove the fixture.

## 19. Known limitations

- No organizer write surface or operational audit events yet.
- No canonical tournament/team identity, standings, games/maps, bracket graph,
  picks/bans, broadcast talent, or prize distribution.
- Player count means distinct players rostered by this submission; unrostered
  global player records are not attributed to a tournament.
- URL validation is application-layer validation; database fields remain text.
- Integration verification requires a working local Docker/Supabase stack or a
  linked remote project. The migration must not be pushed remotely without
  explicit approval.
