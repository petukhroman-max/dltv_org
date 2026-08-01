# Organizer Workspace: players and rosters

This increment adds roster management to the existing admin and organizer workspace surfaces. Both actors use the same discriminated operational access context and service-role-only RPC contract.

## Privacy model

`display_name` is the player identity shown in tournament operations. Safe roster reads contain only display name, country code, optional Steam/Deadlock identifiers, timestamps needed for concurrency, and membership data. `players.real_name` remains stored for a future consented workflow, but is never selected, returned to the browser, accepted by forms, written to audit metadata, or added to public projections.

Player profiles are global and may be shared by multiple tournaments. An organizer can edit a player only while that player belongs to a team in the organizer's submission. The UI warns that a profile edit can affect other rosters.

## Identity and duplicates

Names are trimmed, Unicode-normalized with NFKC, lowercased, and have repeated whitespace collapsed for search. The original display name remains unchanged for presentation. Equal display names are allowed.

Steam and Deadlock IDs use existing partial unique indexes. Matching platform IDs block duplicate creation and direct the user toward the existing player. An exact normalized-name match requires explicit confirmation before creating a distinct player; there is no fuzzy entity resolution.

## Membership lifecycle

- Roles: player, substitute, coach, manager.
- Only an active `player` membership may be captain.
- A partial unique index permits at most one active captain per team.
- Assigning a captain atomically clears the prior captain before assigning the new one.
- Remove is historical: it sets `is_active = false`, `left_at = now()`, and clears captain.
- Restore reactivates the membership, clears `left_at`, accepts a newly selected role, and defaults captain to false.
- Player rows are never physically deleted through this UI.

Player and membership updates, removal, and restoration use `expected_updated_at`. Stale writes fail instead of overwriting concurrent changes.

## Database boundary

Migration `20260801180000_add_players_roster_management.sql` adds only missing captain constraints and roster RPCs; it does not recreate operational tables. Every RPC is `SECURITY DEFINER`, pins `search_path`, has no dynamic SQL, validates submission/team/membership scope, builds allowlisted audit events internally, and is executable only by `service_role`. Raw workspace tokens are validated by the server service and are not passed into roster RPCs.

## Known limitations

There are no player accounts, invitations, roster confirmation, imports, automatic Steam/Deadlock lookup, public roster projection, public player/team pages, images, statistics, matches, schedules, brackets, or bulk roster operations. Global shared-player editing is intentionally retained for MVP and can affect another tournament using that player.
