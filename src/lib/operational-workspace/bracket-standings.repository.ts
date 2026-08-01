import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

type RpcAccess = {
  p_actor_type: "admin" | "organizer_workspace";
  p_actor_id: string | null;
  p_workspace_token_id: string | null;
};

async function rpc(name: string, args: object) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    name as never,
    args as never,
  );
  if (error) throw error;
  return data;
}

export async function selectBracket(submissionId: string, stageId: string) {
  const client = createSupabaseAdminClient();
  const [stage, matches, links] = await Promise.all([
    client
      .from("tournament_stages")
      .select(
        "id, submission_id, name, slug, stage_type, bracket_type, is_public",
      )
      .eq("id", stageId)
      .eq("submission_id", submissionId)
      .maybeSingle(),
    client
      .from("tournament_matches")
      .select(
        "id, match_number, round_name, bracket_section, bracket_round, bracket_position, team_a_id, team_b_id, score_a, score_b, winner_team_id, status, updated_at",
      )
      .eq("submission_id", submissionId)
      .eq("stage_id", stageId),
    client
      .from("tournament_bracket_links")
      .select(
        "id, source_match_id, outcome, target_match_id, target_slot, updated_at",
      )
      .eq("submission_id", submissionId)
      .eq("stage_id", stageId),
  ]);
  const error = stage.error ?? matches.error ?? links.error;
  if (error) throw error;
  return {
    stage: stage.data,
    matches: matches.data ?? [],
    links: links.data ?? [],
  };
}

export async function selectStandings(submissionId: string, stageId: string) {
  const client = createSupabaseAdminClient();
  const [stage, config, groups, adjustments, standings] = await Promise.all([
    client
      .from("tournament_stages")
      .select("id, submission_id, name, slug, stage_type, is_public")
      .eq("id", stageId)
      .eq("submission_id", submissionId)
      .maybeSingle(),
    client
      .from("tournament_stage_standings_config")
      .select("*")
      .eq("submission_id", submissionId)
      .eq("stage_id", stageId)
      .maybeSingle(),
    client
      .from("tournament_stage_group_teams")
      .select("*, team:tournament_teams(id, name, slug, seed, is_public)")
      .eq("submission_id", submissionId)
      .eq("stage_id", stageId),
    client
      .from("tournament_standing_adjustments")
      .select("*, team:tournament_teams(id, name, slug, seed, is_public)")
      .eq("submission_id", submissionId)
      .eq("stage_id", stageId),
    rpc("get_tournament_stage_standings", {
      p_submission_id: submissionId,
      p_stage_id: stageId,
    }),
  ]);
  const error =
    stage.error ?? config.error ?? groups.error ?? adjustments.error;
  if (error) throw error;
  type JoinedTeam = {
    id: string;
    name: string;
    slug: string;
    seed: number | null;
    is_public: boolean;
  };
  type GroupRow = {
    id: string;
    team_id: string;
    group_name: string;
    sequence_number: number;
    updated_at: string;
    team?: JoinedTeam;
  };
  type AdjustmentRow = {
    id: string;
    team_id: string;
    points_adjustment: number;
    rank_override: number | null;
    qualified_override: boolean | null;
    public_note: string | null;
    updated_at: string;
    team?: JoinedTeam;
  };
  return {
    stage: stage.data,
    config: config.data,
    groups: (groups.data ?? []) as unknown as GroupRow[],
    adjustments: (adjustments.data ?? []) as unknown as AdjustmentRow[],
    standings: (standings ?? []) as unknown[],
  };
}

export const assignBracketPositionRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_match_id: string;
    p_expected_updated_at: string;
    p_payload: Json;
  },
) => rpc("assign_match_bracket_position", args);
export const createBracketLinkRpc = (
  args: RpcAccess & { p_submission_id: string; p_payload: Json },
) => rpc("create_tournament_bracket_link", args);
export const deleteBracketLinkRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_link_id: string;
    p_expected_updated_at: string;
  },
) => rpc("delete_tournament_bracket_link", args);
export const advanceBracketOutcomeRpc = (
  args: RpcAccess & { p_submission_id: string; p_match_id: string },
) => rpc("advance_tournament_bracket_outcome", args);
export const updateStandingsConfigRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_stage_id: string;
    p_expected_updated_at: string | null;
    p_payload: Json;
  },
) => rpc("update_stage_standings_config", args);
export const assignGroupTeamRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_stage_id: string;
    p_team_id: string;
    p_group_name: string;
    p_sequence_number: number;
  },
) => rpc("assign_team_to_stage_group", args);
export const removeGroupTeamRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_assignment_id: string;
    p_expected_updated_at: string;
  },
) => rpc("remove_team_from_stage_group", args);
export const upsertAdjustmentRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_stage_id: string;
    p_team_id: string;
    p_expected_updated_at: string | null;
    p_payload: Json;
  },
) => rpc("upsert_standing_adjustment", args);
export const deleteAdjustmentRpc = (
  args: RpcAccess & {
    p_submission_id: string;
    p_adjustment_id: string;
    p_expected_updated_at: string;
  },
) => rpc("delete_standing_adjustment", args);
