import type { AdminTournamentMatch } from "@/lib/domain/tournament-match";
import type { AdminTournamentRosterMember } from "@/lib/domain/tournament-roster";
import { toSafeAdminPlayer } from "@/lib/domain/player";
import type { TableRow } from "@/lib/supabase/database.types";
import { submissionId } from "@/test/admin-fixtures";

export const stageId = "37452ac3-8871-4a33-9bad-81b4059a1703";
export const teamAId = "ecf4bbd7-6dbc-48b4-a652-95e0161be8ef";
export const teamBId = "343273ac-027a-41cd-b70b-8926164db4fa";
export const playerId = "91a3aa06-534b-41f1-8778-a29ea24fa8d8";

export function makeStage(
  overrides: Partial<TableRow<"tournament_stages">> = {},
): TableRow<"tournament_stages"> {
  return {
    id: stageId,
    submission_id: submissionId,
    name: "Qualifier",
    slug: "qualifier",
    stage_type: "qualifier",
    sequence_number: 1,
    start_at: "2026-08-10T10:00:00Z",
    end_at: "2026-08-10T18:00:00Z",
    timezone: "Europe/Berlin",
    format_text: "Swiss",
    best_of_default: 3,
    team_count: 16,
    is_online: true,
    location_name: null,
    status: "scheduled",
    is_public: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTeam(
  overrides: Partial<TableRow<"tournament_teams">> = {},
): TableRow<"tournament_teams"> {
  return {
    id: teamAId,
    submission_id: submissionId,
    name: "Team Alpha",
    short_name: "ALPHA",
    slug: "team-alpha",
    logo_url: "https://example.com/logo.png",
    region: "EU",
    seed: 1,
    status: "active",
    external_team_id: null,
    source: "manual",
    is_public: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

export function makePlayer(
  overrides: Partial<TableRow<"players">> = {},
): TableRow<"players"> {
  return {
    id: playerId,
    display_name: "PlayerOne",
    normalized_name: "playerone",
    real_name: "Private Name",
    country_code: "DE",
    steam_id: null,
    deadlock_account_id: null,
    external_player_id: null,
    source: "manual",
    is_public: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

export function makeRoster(
  overrides: Partial<AdminTournamentRosterMember> = {},
): AdminTournamentRosterMember {
  const safePlayer = toSafeAdminPlayer(makePlayer());
  return {
    id: "40525d2b-3f10-44ad-8e61-fc2bd3081a70",
    tournament_team_id: teamAId,
    player_id: playerId,
    role: "player",
    is_captain: false,
    is_active: true,
    joined_at: null,
    left_at: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    team: { id: teamAId, name: "Team Alpha", seed: 1 },
    player: safePlayer,
    ...overrides,
  };
}

export function makeMatch(
  overrides: Partial<AdminTournamentMatch> = {},
): AdminTournamentMatch {
  return {
    id: "a360741a-9af4-44b3-9a1b-4781a0bc190c",
    public_id: "mt_a360741a9af444b39a1b4781a0bc190c",
    submission_id: submissionId,
    stage_id: stageId,
    match_number: 1,
    round_name: "Round 1",
    group_name: null,
    scheduled_at: "2026-08-10T12:00:00Z",
    best_of: 3,
    team_a_id: teamAId,
    team_b_id: teamBId,
    score_a: null,
    score_b: null,
    winner_team_id: null,
    status: "scheduled",
    deadlock_match_id: null,
    stream_url: "https://example.com/live",
    vod_url: null,
    duration_seconds: null,
    source: "manual",
    is_public: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    timezone: "UTC",
    stage: { id: stageId, name: "Qualifier", sequence_number: 1 },
    team_a: { id: teamAId, name: "Team Alpha" },
    team_b: { id: teamBId, name: "Team Beta" },
    winner_team: null,
    ...overrides,
  };
}
