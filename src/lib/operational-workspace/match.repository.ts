import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type MatchRpcAccess = {
  p_actor_type: "admin" | "organizer_workspace";
  p_actor_id: string | null;
  p_workspace_token_id: string | null;
};

export type MatchCreateRpcArguments = MatchRpcAccess & {
  p_submission_id: string;
  p_payload: Json;
};
export type MatchMutationRpcArguments = MatchCreateRpcArguments & {
  p_match_id: string;
  p_expected_updated_at: string;
};
export type MatchVersionRpcArguments = Omit<
  MatchMutationRpcArguments,
  "p_payload"
>;

async function executeRpc(name: string, args: object) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    name as never,
    args as never,
  );
  if (error) throw error;
  return data;
}

export const executeCreateMatchRpc = (args: MatchCreateRpcArguments) =>
  executeRpc("create_tournament_match", args);
export const executeUpdateMatchRpc = (args: MatchMutationRpcArguments) =>
  executeRpc("update_tournament_match", args);
export const executeUpdateMatchStatusRpc = (args: MatchMutationRpcArguments) =>
  executeRpc("update_tournament_match_status", args);
export const executeCompleteMatchRpc = (args: MatchMutationRpcArguments) =>
  executeRpc("complete_tournament_match", args);
export const executeCancelMatchRpc = (args: MatchVersionRpcArguments) =>
  executeRpc("cancel_tournament_match", args);
export const executeReopenMatchRpc = (args: MatchMutationRpcArguments) =>
  executeRpc("reopen_tournament_match", args);
export const executeDeleteMatchRpc = (args: MatchVersionRpcArguments) =>
  executeRpc("delete_tournament_match", args);

const matchSelection =
  "*, stage:tournament_stages(id, name, sequence_number, timezone), team_a:tournament_teams!tournament_matches_team_a_id_fkey(id, name), team_b:tournament_teams!tournament_matches_team_b_id_fkey(id, name), winner_team:tournament_teams!tournament_matches_winner_team_id_fkey(id, name), submission:tournament_submissions!inner(timezone)";

function toReadModel(row: Record<string, unknown>) {
  const submission = row.submission as { timezone?: string } | null;
  const stage = row.stage as { timezone?: string | null } | null;
  const match = { ...row };
  delete match.submission;
  return {
    ...match,
    timezone: stage?.timezone ?? submission?.timezone ?? "UTC",
  };
}

export async function selectTournamentMatches(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_matches")
    .select(matchSelection)
    .eq("submission_id", submissionId);
  if (error) throw error;
  return (data ?? []).map((row) => toReadModel(row as never));
}

export async function selectTournamentMatch(
  submissionId: string,
  matchId: string,
) {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_matches")
    .select(matchSelection)
    .eq("submission_id", submissionId)
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  return data ? toReadModel(data as never) : null;
}
