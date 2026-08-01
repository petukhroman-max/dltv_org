# Brackets and standings architecture

## Scope and ownership

Bracket and standings data belongs to one tournament submission. Existing stages,
teams and matches remain the source entities. New foreign-key scope triggers reject
references that cross submission or stage boundaries, and all mutations reuse
`assert_operational_mutation_access` so only a verified admin or organizer workspace
token can write.

Direct access for `anon` and `authenticated` remains revoked. Public pages are built
by the server-side allowlisted projection and never expose internal identifiers,
workspace tokens, audit metadata or player private fields.

Existing `stage_type`, match participants/results/status, `round_name`,
`group_name`, team seed and visibility flags are reused. The migration adds only
the normalized relationships and configuration that cannot be represented safely
by those fields. Automatic seeding, schedule generation, Swiss pairing, reset
brackets, head-to-head tie-breaks and import are deferred.

## Bracket model

- `tournament_stages.bracket_type` explicitly enables `single_elimination` or
  `double_elimination` for a custom/playoff/final stage. Elimination stage types are
  compatible by default; qualifier, group, Swiss and round-robin stages reject it.
- Matches receive `bracket_section`, `bracket_round` and `bracket_position`. A unique
  stage/section/round/position identifies one bracket card.
- `tournament_bracket_links` connects a source outcome (`winner` or `loser`) to a
  destination slot (`team_a` or `team_b`). Links are acyclic, stage-scoped and cannot
  target a completed result.
- Completion and walkover trigger advancement in the same database transaction.
  An empty or matching target slot is assigned. A conflicting occupied slot is left
  unchanged and an auditable `bracket_advancement_conflict` warning is recorded, so
  recording a valid result is never lost.
- Reopening does not silently erase downstream assignments. The UI can warn from the
  existing links, and an operator must reconcile affected slots explicitly.

## Standings model

- `tournament_stage_standings_config` enables standings and stores win, loss and
  walkover points, score-difference policy, calculation mode and qualification
  places. Custom stages require explicit enablement; qualifier, group-stage and
  round-robin stages are compatible.
- `tournament_stage_group_teams` assigns teams to named groups and ensures teams with
  no matches still appear.
- `tournament_standing_adjustments` stores auditable point, rank and qualification
  overrides plus an optional bounded public note. Match statistics are not persisted.
- The standings projection counts only `completed` and `walkover` matches. Ranking is
  deterministic: rank override, points, wins, score difference, score for, seed
  (null last), then team name.

## Concurrency, audit and caching

Mutable records use `updated_at` as an optimistic concurrency token. RPCs return
stable database error codes which the application maps to stable UI messages. Every
successful configuration mutation and automatic advancement appends a
`submission_events` audit row. Successful organizer/admin actions invalidate the
workspace/admin path and both localized public tournament projections.

The public model translates internal match/team identifiers into existing safe match
labels and team slugs. Only public stages, matches and teams enter the projection;
configuration internals, adjustment metadata, audit data and UUIDs are omitted.
