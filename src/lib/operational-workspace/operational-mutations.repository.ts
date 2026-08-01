import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export type RpcAccessArguments = {
  p_actor_type: "admin" | "organizer_workspace";
  p_actor_id: string | null;
  p_workspace_token_id: string | null;
};

export type CreateOperationalRpcArguments = RpcAccessArguments & {
  p_submission_id: string;
  p_payload: Json;
};

export type UpdateStageRpcArguments = CreateOperationalRpcArguments & {
  p_stage_id: string;
  p_expected_updated_at: string;
};
export type DeleteStageRpcArguments = Omit<
  UpdateStageRpcArguments,
  "p_payload"
>;
export type UpdateTeamRpcArguments = CreateOperationalRpcArguments & {
  p_team_id: string;
  p_expected_updated_at: string;
};
export type DeleteTeamRpcArguments = Omit<UpdateTeamRpcArguments, "p_payload">;

async function executeRpc(
  name: keyof import("@/lib/supabase/database.types").Database["public"]["Functions"],
  args: object,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    name,
    args as never,
  );
  if (error) throw error;
  return data;
}

export const executeCreateStageRpc = (args: CreateOperationalRpcArguments) =>
  executeRpc("create_tournament_stage", args);
export const executeUpdateStageRpc = (args: UpdateStageRpcArguments) =>
  executeRpc("update_tournament_stage", args);
export const executeDeleteStageRpc = (args: DeleteStageRpcArguments) =>
  executeRpc("delete_tournament_stage", args);
export const executeCreateTeamRpc = (args: CreateOperationalRpcArguments) =>
  executeRpc("create_tournament_team", args);
export const executeUpdateTeamRpc = (args: UpdateTeamRpcArguments) =>
  executeRpc("update_tournament_team", args);
export const executeDeleteTeamRpc = (args: DeleteTeamRpcArguments) =>
  executeRpc("delete_tournament_team", args);

export async function listStageSlugs(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_stages")
    .select("slug")
    .eq("submission_id", submissionId);
  if (error) throw error;
  return (data ?? []).map((row) => row.slug);
}

export async function listTeamSlugs(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_teams")
    .select("slug")
    .eq("submission_id", submissionId);
  if (error) throw error;
  return (data ?? []).map((row) => row.slug);
}
