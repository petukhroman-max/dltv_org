import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PublicMatchRow,
  PublicRosterRow,
  PublicStageRow,
  PublicTeamRow,
  PublicStructureRows,
} from "@/lib/public-tournaments/public-operational.types";

function queryFailed(): never {
  throw new Error("Public operational projection query failed");
}

export async function listPublicTournamentStages(
  submissionId: string,
): Promise<PublicStageRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_stages")
    .select(
      "id, submission_id, name, slug, stage_type, bracket_type, sequence_number, start_at, end_at, timezone, format_text, best_of_default, team_count, is_online, location_name, status, is_public",
    )
    .eq("submission_id", submissionId)
    .eq("is_public", true)
    .order("sequence_number", { ascending: true })
    .order("slug", { ascending: true })
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) queryFailed();
  return (data ?? []) as PublicStageRow[];
}

export async function listPublicTournamentTeams(
  submissionId: string,
): Promise<PublicTeamRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_teams")
    .select(
      "id, submission_id, name, short_name, slug, logo_url, region, seed, status, is_public",
    )
    .eq("submission_id", submissionId)
    .eq("is_public", true)
    .order("seed", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true })
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) queryFailed();
  return (data ?? []) as PublicTeamRow[];
}

export async function listPublicTournamentRosters(
  submissionId: string,
): Promise<PublicRosterRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_roster_members")
    .select(
      "tournament_team_id, role, is_captain, is_active, team:tournament_teams!inner(submission_id, is_public), player:players!inner(display_name, country_code, is_public)",
    )
    .eq("is_active", true)
    .eq("team.submission_id", submissionId)
    .eq("team.is_public", true)
    .eq("player.is_public", true)
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) queryFailed();
  return (data ?? []) as unknown as PublicRosterRow[];
}

export async function listPublicTournamentMatches(
  submissionId: string,
): Promise<PublicMatchRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_matches")
    .select(
      "id, public_id, submission_id, stage_id, match_number, round_name, group_name, bracket_section, bracket_round, bracket_position, scheduled_at, best_of, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, deadlock_match_id, stream_url, vod_url, duration_seconds, is_public",
    )
    .eq("submission_id", submissionId)
    .eq("is_public", true)
    .in("status", [
      "scheduled",
      "live",
      "completed",
      "postponed",
      "cancelled",
      "walkover",
    ])
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) queryFailed();
  return (data ?? []) as PublicMatchRow[];
}

export async function listPublicTournamentStructures(
  submissionId: string,
  stageIds: string[],
): Promise<PublicStructureRows> {
  const client = createSupabaseAdminClient();
  const { data: bracketLinks, error } = await client
    .from("tournament_bracket_links")
    .select("stage_id, source_match_id, outcome, target_match_id, target_slot")
    .eq("submission_id", submissionId)
    .abortSignal(AbortSignal.timeout(8_000));
  if (error) queryFailed();
  const standingsEntries = await Promise.all(
    stageIds.map(async (stageId) => {
      const { data, error: standingsError } = await client
        .rpc("get_tournament_stage_standings", {
          p_submission_id: submissionId,
          p_stage_id: stageId,
        })
        .abortSignal(AbortSignal.timeout(8_000));
      if (standingsError) queryFailed();
      return [stageId, data ?? []] as const;
    }),
  );
  return {
    bracketLinks: bracketLinks ?? [],
    standingsByStage: Object.fromEntries(
      standingsEntries,
    ) as PublicStructureRows["standingsByStage"],
  };
}
