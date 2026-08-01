import "server-only";

import { z } from "zod";

import type { SafeAdminPlayer } from "@/lib/domain/player";
import type { AdminTournamentMatch } from "@/lib/domain/tournament-match";
import type { AdminTournamentRosterMember } from "@/lib/domain/tournament-roster";
import type { AdminTournamentStage } from "@/lib/domain/tournament-stage";
import type { AdminTournamentTeam } from "@/lib/domain/tournament-team";
import {
  RepositoryError,
  toRepositoryError,
} from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TournamentOperationalSummary = {
  stages_count: number;
  teams_count: number;
  players_count: number;
  matches_count: number;
  scheduled_matches_count: number;
  completed_matches_count: number;
};

export type StageExecutor = (
  submissionId: string,
) => Promise<AdminTournamentStage[]>;
export type TeamExecutor = (
  submissionId: string,
) => Promise<AdminTournamentTeam[]>;
export type RosterExecutor = (
  submissionId: string,
) => Promise<AdminTournamentRosterMember[]>;
export type MatchExecutor = (
  submissionId: string,
) => Promise<AdminTournamentMatch[]>;
export type SummaryExecutor = (
  submissionId: string,
) => Promise<TournamentOperationalSummary>;

function validateSubmissionId(submissionId: string) {
  return z.string().uuid().parse(submissionId);
}

async function safeQuery<T>(query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    throw toRepositoryError(error);
  }
}

async function executeStages(
  submissionId: string,
): Promise<AdminTournamentStage[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_stages")
    .select("*")
    .eq("submission_id", submissionId);
  if (error) throw error;
  return data ?? [];
}

async function executeTeams(
  submissionId: string,
): Promise<AdminTournamentTeam[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_teams")
    .select("*")
    .eq("submission_id", submissionId);
  if (error) throw error;
  return data ?? [];
}

async function executeRosters(
  submissionId: string,
): Promise<AdminTournamentRosterMember[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_roster_members")
    .select(
      "id, tournament_team_id, player_id, role, is_captain, is_active, joined_at, left_at, created_at, updated_at, team:tournament_teams!inner(id, name, seed, submission_id), player:players!inner(id, display_name, normalized_name, country_code, steam_id, deadlock_account_id, external_player_id, source, is_public, created_at, updated_at)",
    )
    .eq("team.submission_id", submissionId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    tournament_team_id: row.tournament_team_id,
    player_id: row.player_id,
    role: row.role,
    is_captain: row.is_captain,
    is_active: row.is_active,
    joined_at: row.joined_at,
    left_at: row.left_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    team: { id: row.team.id, name: row.team.name, seed: row.team.seed },
    player: row.player as SafeAdminPlayer,
  }));
}

async function executeMatches(
  submissionId: string,
): Promise<AdminTournamentMatch[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_matches")
    .select(
      "*, stage:tournament_stages(id, name, sequence_number), team_a:tournament_teams!tournament_matches_team_a_id_fkey(id, name), team_b:tournament_teams!tournament_matches_team_b_id_fkey(id, name), winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name)",
    )
    .eq("submission_id", submissionId);
  if (error) throw error;
  return (data ?? []) as AdminTournamentMatch[];
}

async function executeSummary(
  submissionId: string,
): Promise<TournamentOperationalSummary> {
  const client = createSupabaseAdminClient();
  const [stages, teams, roster, matches, scheduled, completed] =
    await Promise.all([
      client
        .from("tournament_stages")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId),
      client
        .from("tournament_teams")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId),
      client
        .from("tournament_roster_members")
        .select("player_id, team:tournament_teams!inner(submission_id)")
        .eq("team.submission_id", submissionId),
      client
        .from("tournament_matches")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId),
      client
        .from("tournament_matches")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId)
        .eq("status", "scheduled"),
      client
        .from("tournament_matches")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId)
        .eq("status", "completed"),
    ]);

  const error = [stages, teams, roster, matches, scheduled, completed].find(
    (result) => result.error,
  )?.error;
  if (error) throw error;

  return {
    stages_count: stages.count ?? 0,
    teams_count: teams.count ?? 0,
    players_count: new Set((roster.data ?? []).map((row) => row.player_id))
      .size,
    matches_count: matches.count ?? 0,
    scheduled_matches_count: scheduled.count ?? 0,
    completed_matches_count: completed.count ?? 0,
  };
}

export async function listTournamentStages(
  submissionId: string,
  execute: StageExecutor = executeStages,
) {
  const id = validateSubmissionId(submissionId);
  const rows = await safeQuery(() => execute(id));
  return [...rows].sort((a, b) => a.sequence_number - b.sequence_number);
}

export async function listTournamentTeams(
  submissionId: string,
  execute: TeamExecutor = executeTeams,
) {
  const id = validateSubmissionId(submissionId);
  const rows = await safeQuery(() => execute(id));
  return [...rows].sort(
    (a, b) =>
      (a.seed ?? Number.MAX_SAFE_INTEGER) -
        (b.seed ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name),
  );
}

const rosterRoleOrder = new Map([
  ["player", 0],
  ["substitute", 1],
  ["coach", 2],
  ["manager", 3],
]);

export async function listTournamentRosters(
  submissionId: string,
  execute: RosterExecutor = executeRosters,
) {
  const id = validateSubmissionId(submissionId);
  const rows = await safeQuery(() => execute(id));
  return rows
    .map((row) => ({
      ...row,
      player: {
        id: row.player.id,
        display_name: row.player.display_name,
        normalized_name: row.player.normalized_name,
        country_code: row.player.country_code,
        steam_id: row.player.steam_id,
        deadlock_account_id: row.player.deadlock_account_id,
        external_player_id: row.player.external_player_id,
        source: row.player.source,
        is_public: row.player.is_public,
        created_at: row.player.created_at,
        updated_at: row.player.updated_at,
      },
    }))
    .sort(
      (a, b) =>
        a.team.name.localeCompare(b.team.name) ||
        (rosterRoleOrder.get(a.role) ?? 99) -
          (rosterRoleOrder.get(b.role) ?? 99) ||
        a.player.display_name.localeCompare(b.player.display_name),
    );
}

export async function listTournamentMatches(
  submissionId: string,
  execute: MatchExecutor = executeMatches,
) {
  const id = validateSubmissionId(submissionId);
  const rows = await safeQuery(() => execute(id));
  return [...rows].sort(
    (a, b) =>
      (a.scheduled_at ? Date.parse(a.scheduled_at) : Number.MAX_SAFE_INTEGER) -
        (b.scheduled_at
          ? Date.parse(b.scheduled_at)
          : Number.MAX_SAFE_INTEGER) ||
      (a.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) -
        (b.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) ||
      (a.match_number ?? Number.MAX_SAFE_INTEGER) -
        (b.match_number ?? Number.MAX_SAFE_INTEGER),
  );
}

export async function getTournamentOperationalSummary(
  submissionId: string,
  execute: SummaryExecutor = executeSummary,
) {
  const id = validateSubmissionId(submissionId);
  return safeQuery(() => execute(id));
}
