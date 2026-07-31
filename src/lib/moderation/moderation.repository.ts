import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ModerationRpcArguments = {
  p_submission_id: string;
  p_expected_status: string;
  p_target_status: string;
  p_reviewer_id: string;
  p_reviewer_note: string | null;
};

export async function executeModerationRpc(args: ModerationRpcArguments) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    "moderate_tournament_submission",
    args,
  );

  if (error) {
    throw error;
  }

  return data;
}
