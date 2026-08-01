"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import type { OperationalActionState } from "@/lib/operational-workspace/action-state";
import { runOperationalMutation } from "@/lib/operational-workspace/operational-action-runner";

async function run(
  entity: "stage" | "team",
  operation: "create" | "update" | "delete",
  submissionId: string,
  formData: FormData,
): Promise<OperationalActionState> {
  const identity = await requireAdmin();
  const result = await runOperationalMutation(
    entity,
    operation,
    submissionId,
    { kind: "admin", identity },
    formData,
  );
  if (result.status === "success") {
    revalidatePath(`/admin/submissions/${submissionId}`);
  }
  return result;
}

export async function createAdminStageAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "create", submissionId, formData);
}
export async function updateAdminStageAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "update", submissionId, formData);
}
export async function deleteAdminStageAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("stage", "delete", submissionId, formData);
}
export async function createAdminTeamAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "create", submissionId, formData);
}
export async function updateAdminTeamAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "update", submissionId, formData);
}
export async function deleteAdminTeamAction(
  submissionId: string,
  _previousState: OperationalActionState,
  formData: FormData,
) {
  return run("team", "delete", submissionId, formData);
}
