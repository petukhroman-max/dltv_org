import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/database.types";

export type RosterRpcArgs = {
  p_submission_id: string;
  p_payload: Json;
  p_actor_type: "admin" | "organizer_workspace";
  p_actor_id: string | null;
  p_workspace_token_id: string | null;
};

async function rpc(name: keyof Database["public"]["Functions"], args: object) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    name,
    args as never,
  );
  if (error) throw error;
  return data;
}

export const executeCreatePlayerAndAddRpc = (args: RosterRpcArgs) =>
  rpc("create_player_and_add_to_roster", args);
export const executeAddExistingPlayerRpc = (args: RosterRpcArgs) =>
  rpc("add_existing_player_to_roster", args);
export const executeUpdatePlayerRpc = (args: RosterRpcArgs) =>
  rpc("update_player_profile", args);
export const executeUpdateMembershipRpc = (args: RosterRpcArgs) =>
  rpc("update_roster_membership", args);
export const executeRemoveMembershipRpc = (args: RosterRpcArgs) =>
  rpc("remove_roster_member", args);
export const executeRestoreMembershipRpc = (args: RosterRpcArgs) =>
  rpc("restore_roster_member", args);

export async function executePlayerSearchRpc(
  args: Omit<RosterRpcArgs, "p_payload"> & { p_query: string },
) {
  return rpc("search_players_for_roster", args);
}

export async function executeListTeamRoster(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("tournament_roster_members")
    .select(
      "id, tournament_team_id, player_id, role, is_captain, is_active, joined_at, left_at, updated_at, team:tournament_teams!inner(submission_id), player:players!inner(id, display_name, country_code, steam_id, deadlock_account_id, updated_at)",
    )
    .eq("team.submission_id", submissionId);
  if (error) throw error;
  return data ?? [];
}
