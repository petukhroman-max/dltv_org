"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import type { OperationalActionState } from "@/lib/operational-workspace/action-state";
import { runOperationalMutation } from "@/lib/operational-workspace/operational-action-runner";
import type {
  RosterActionState,
  RosterSearchState,
} from "@/lib/operational-workspace/roster-action-state";
import {
  runRosterMutation,
  runRosterSearch,
  type RosterOperation,
} from "@/lib/operational-workspace/roster-action-runner";

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

async function runRoster(
  operation: RosterOperation,
  submissionId: string,
  formData: FormData,
) {
  const identity = await requireAdmin();
  const result = await runRosterMutation(
    operation,
    submissionId,
    { kind: "admin", identity },
    formData,
  );
  if (result.status === "success")
    revalidatePath(`/admin/submissions/${submissionId}`);
  return result;
}

export async function createAdminPlayerAndRosterAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("create_player", submissionId, formData);
}
export async function addAdminExistingPlayerAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("add_existing", submissionId, formData);
}
export async function updateAdminPlayerAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("update_player", submissionId, formData);
}
export async function updateAdminRosterAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("update_membership", submissionId, formData);
}
export async function removeAdminRosterAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("remove", submissionId, formData);
}
export async function restoreAdminRosterAction(
  submissionId: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runRoster("restore", submissionId, formData);
}
export async function searchAdminPlayersAction(
  submissionId: string,
  _state: RosterSearchState,
  formData: FormData,
) {
  const identity = await requireAdmin();
  return runRosterSearch(submissionId, { kind: "admin", identity }, formData);
}
