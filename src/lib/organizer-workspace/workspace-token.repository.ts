import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type CreateWorkspaceTokenRpcArguments = {
  p_submission_id: string;
  p_token_hash: string;
  p_label: string | null;
  p_expires_at: string;
  p_created_by: string;
};

export async function executeCreateWorkspaceTokenRpc(
  args: CreateWorkspaceTokenRpcArguments,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "create_organizer_workspace_token",
    args,
  );
  if (error) throw error;
  return data;
}

export async function executeRevokeWorkspaceTokenRpc(args: {
  p_submission_id: string;
  p_reviewer_id: string;
}) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "revoke_organizer_workspace_token",
    args,
  );
  if (error) throw error;
  return data;
}

export async function executeValidateWorkspaceAccessRpc(tokenHash: string) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "validate_organizer_workspace_access",
    { p_token_hash: tokenHash },
  );
  if (error) throw error;
  return data;
}

export async function touchWorkspaceToken(
  tokenId: string,
  tokenHash: string,
  usedAt: string,
) {
  const { error } = await createSupabaseAdminClient()
    .from("organizer_workspace_tokens")
    .update({ last_used_at: usedAt })
    .eq("id", tokenId)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", usedAt);
  if (error) throw error;
}

export async function findLatestWorkspaceToken(submissionId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("organizer_workspace_tokens")
    .select("id, label, expires_at, revoked_at, last_used_at, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
