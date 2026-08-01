# Tournament brackets and standings

## Product scope

This feature presents existing matches as a manually configured single- or
double-elimination bracket and calculates group/round-robin standings. It is an MVP,
not a universal tournament engine.

Bracket editing is available for `single_elimination`, `double_elimination`,
`playoff`, `final` and explicitly configured `custom` stages. Standings are available
for `qualifier`, `group_stage`, `round_robin` and explicitly enabled `custom` stages.

## Bracket data and links

Matches use normalized `bracket_section`, `bracket_round` and `bracket_position`
columns. Supported sections are main, winners, losers, grand final and optional third
place. A stage/section/round/position can contain only one match.

`tournament_bracket_links` connects a winner or loser outcome to Team A or Team B of
a later match. Scope triggers reject self-links, cross-stage/submission references,
cycles, occupied target slots, completed targets and links to an earlier round.

When a match becomes completed or walkover, its winner and optional loser advance in
the same transaction. An empty or identical slot is safe. A different team is never
overwritten: the result remains saved and a `bracket_advancement_conflict` audit event
requires manual correction. Reopening a result never performs a destructive graph
rollback or silently removes downstream teams.

Double elimination supports winners, losers and one grand final. Grand-final reset
logic is not automated; a reset must be represented as an ordinary extra match.

## Standings calculation

Standings are a derived read model. Only completed and walkover matches count.
Scheduled, live, postponed, cancelled and draft matches are ignored. Each row contains
played, wins, losses, score for/against/difference, total points, rank and qualified
state. Valid walkover scores count when present; otherwise only the outcome and
configured walkover points count.

Configuration controls points for wins, losses and walkovers, whether score difference
is a tie-break, qualification places and calculation mode. `group_name` from matches
defines normal membership; `tournament_stage_group_teams` adds ordered zero-match
teams. Point/rank/qualification overrides and a plain-text public note are stored in
`tournament_standing_adjustments`.

Ranking is deterministic: explicit rank override, total points descending, wins
descending, score difference descending when enabled, score for descending, seed
ascending with null last, then team name. Head-to-head tie-break is deliberately not
implemented.

## Public projection, localization and security

Public bracket/standings sections and navigation appear only when safe data exists.
The server projection allowlists public stages, matches and teams, converts internal
references to public labels/slugs and excludes UUIDs, configuration internals, private
notes, audit metadata and workspace credentials. Public notes are bounded plain text.

Organizer/admin screens and public output provide English and Russian labels. Desktop
brackets scroll only inside their container; at mobile width they become an accessible
round-by-round list. Standings use semantic, captioned tables inside contained scroll.

All write RPCs are `SECURITY DEFINER`, pin `search_path`, accept only server-derived
actor identity, reuse the existing access context, and are executable only by
`service_role`. New tables have RLS enabled and no `anon`/`authenticated` access.

## Manual smoke-test (no SQL)

1. Create a single-elimination stage, two semifinals and a final.
2. Assign bracket sections, rounds and positions.
3. Link both semifinal winners to the final slots.
4. Complete a semifinal and confirm the winner advances.
5. Open the public bracket and verify only public entities appear.
6. Create a group stage and enable standings.
7. Assign teams, including one team with no matches, to a group.
8. Complete a match and record a walkover.
9. Confirm played/win/loss/score/points ordering.
10. Add a point or qualification adjustment with a public note.
11. Verify public standings omit internal identifiers and configuration.
12. Repeat key views in EN/RU and at 375 px width.

## Known limitations and next step

There is no drag-and-drop editor, automatic seeding/scheduling, bracket reset,
head-to-head tie-break, arbitrary rules engine, dispute flow, map statistics, public
API or widget. Reopened results require manual downstream reconciliation. The next
planned scope is a Guildlock XLSX / Google Sheets import prototype.
