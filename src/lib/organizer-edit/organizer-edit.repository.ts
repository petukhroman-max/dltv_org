import "server-only";

import type { ParsedTournamentSubmissionInput } from "@/lib/domain/submission";
import type { EditableSubmission } from "@/lib/organizer-edit/organizer-edit.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json, TableRow } from "@/lib/supabase/database.types";

export type CreateEditTokenRpcArguments = {
  p_submission_id: string;
  p_token_hash: string;
  p_expires_at: string;
  p_created_by: string;
};

export type RevokeEditTokensRpcArguments = {
  p_submission_id: string;
  p_reviewer_id: string;
};

export type ResubmitRpcArguments = {
  p_token_hash: string;
  p_submission: Json;
};

export async function executeCreateEditTokenRpc(
  args: CreateEditTokenRpcArguments,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "create_submission_edit_token",
    args,
  );
  if (error) throw error;
  return data;
}

export async function executeRevokeEditTokensRpc(
  args: RevokeEditTokensRpcArguments,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "revoke_submission_edit_tokens",
    args,
  );
  if (error) throw error;
  return data;
}

export async function executeResubmitRpc(args: ResubmitRpcArguments) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "resubmit_tournament_submission",
    args,
  );
  if (error) throw error;
  return data;
}

export async function findEditableSubmissionByHash(
  tokenHash: string,
): Promise<EditableSubmission | null> {
  const supabase = createSupabaseAdminClient();
  const { data: token, error: tokenError } = await supabase
    .from("submission_edit_tokens")
    .select("submission_id, expires_at, used_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) throw tokenError;
  if (
    !token ||
    token.used_at ||
    token.revoked_at ||
    new Date(token.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  const { data, error } = await supabase
    .from("tournament_submissions")
    .select(
      "id, tournament_name, description, region, language, start_date, end_date, timezone, format, prize_pool_text, registration_url, bracket_url, discord_url, stream_url, rules_url, is_online, max_teams, registration_deadline, organizer_notes, reviewer_notes, status",
    )
    .eq("id", token.submission_id)
    .eq("status", "needs_changes")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { status, ...editable } = data;
  void status;
  return editable as EditableSubmission;
}

export async function findLatestEditTokenForSubmission(
  submissionId: string,
): Promise<Pick<
  TableRow<"submission_edit_tokens">,
  "id" | "expires_at" | "used_at" | "revoked_at" | "created_at"
> | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("submission_edit_tokens")
    .select("id, expires_at, used_at, revoked_at, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function toResubmissionJson(
  submission: ParsedTournamentSubmissionInput,
): Json {
  return submission as unknown as Json;
}
