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
import type {
  MatchActionState,
  MatchOperation,
} from "@/lib/operational-workspace/match-action-state";
import { runMatchMutation } from "@/lib/operational-workspace/match-action-runner";
import { revalidatePublicTournamentProjection } from "@/lib/public-tournaments/public-operational.revalidation";

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
    await revalidatePublicTournamentProjection(submissionId);
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
  if (result.status === "success") {
    await revalidatePublicTournamentProjection(submissionId);
    revalidatePath(`/admin/submissions/${submissionId}`);
  }
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

async function runMatch(
  operation: MatchOperation,
  submissionId: string,
  formData: FormData,
): Promise<MatchActionState> {
  const identity = await requireAdmin();
  const result = await runMatchMutation(
    operation,
    submissionId,
    { kind: "admin", identity },
    formData,
  );
  if (result.status === "success") {
    await revalidatePublicTournamentProjection(submissionId);
    revalidatePath(`/admin/submissions/${submissionId}`);
  }
  return result;
}

export async function createAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("create", submissionId, formData);
}
export async function updateAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("update", submissionId, formData);
}
export async function scheduleAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("schedule", submissionId, formData);
}
export async function startAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("start", submissionId, formData);
}
export async function postponeAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("postpone", submissionId, formData);
}
export async function completeAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("complete", submissionId, formData);
}
export async function walkoverAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("walkover", submissionId, formData);
}
export async function cancelAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("cancel", submissionId, formData);
}
export async function reopenAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("reopen", submissionId, formData);
}
export async function deleteAdminMatchAction(
  submissionId: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runMatch("delete", submissionId, formData);
}
