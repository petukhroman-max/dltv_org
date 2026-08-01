"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import type { OperationalActionState } from "@/lib/operational-workspace/action-state";
import { runOperationalMutation } from "@/lib/operational-workspace/operational-action-runner";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";

async function run(
  entity: "stage" | "team",
  operation: "create" | "update" | "delete",
  rawToken: string,
  formData: FormData,
): Promise<OperationalActionState> {
  const access = await validateWorkspaceAccess(rawToken);
  if (!access) {
    return {
      status: "error",
      message: "This workspace link is invalid or no longer available.",
      fieldErrors: {},
      values: {},
    };
  }
  const result = await runOperationalMutation(
    entity,
    operation,
    access.submission.id,
    {
      kind: "organizer_workspace",
      submissionId: access.submission.id,
      tokenId: access.tokenId,
    },
    formData,
  );
  if (result.status === "success") {
    revalidatePath(`/workspace/${rawToken}`);
    revalidatePath(`/admin/submissions/${access.submission.id}`);
  }
  return result;
}

export async function createWorkspaceStageAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "create", rawToken, formData);
}
export async function updateWorkspaceStageAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "update", rawToken, formData);
}
export async function deleteWorkspaceStageAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "delete", rawToken, formData);
}
export async function createWorkspaceTeamAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "create", rawToken, formData);
}
export async function updateWorkspaceTeamAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "update", rawToken, formData);
}
export async function deleteWorkspaceTeamAction(
  rawToken: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "delete", rawToken, formData);
}
