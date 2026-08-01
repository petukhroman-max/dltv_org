"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import type { OperationalActionState } from "@/lib/operational-workspace/action-state";
import { runOperationalMutation } from "@/lib/operational-workspace/operational-action-runner";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
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
    revalidatePublicTournamentProjection();
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

async function workspaceContext(rawToken: string) {
  const access = await validateWorkspaceAccess(rawToken);
  return access
    ? {
        submissionId: access.submission.id,
        context: {
          kind: "organizer_workspace" as const,
          submissionId: access.submission.id,
          tokenId: access.tokenId,
        },
      }
    : null;
}

async function runWorkspaceRoster(
  operation: RosterOperation,
  rawToken: string,
  formData: FormData,
): Promise<RosterActionState> {
  const access = await workspaceContext(rawToken);
  if (!access)
    return {
      status: "error",
      message: "This workspace link is invalid or no longer available.",
      fieldErrors: {},
      values: {},
    };
  const result = await runRosterMutation(
    operation,
    access.submissionId,
    access.context,
    formData,
  );
  if (result.status === "success") {
    revalidatePublicTournamentProjection();
    revalidatePath(`/workspace/${rawToken}`);
    revalidatePath(`/admin/submissions/${access.submissionId}`);
  }
  return result;
}

export async function createWorkspacePlayerAndRosterAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("create_player", rawToken, formData);
}
export async function addWorkspaceExistingPlayerAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("add_existing", rawToken, formData);
}
export async function updateWorkspacePlayerAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("update_player", rawToken, formData);
}
export async function updateWorkspaceRosterAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("update_membership", rawToken, formData);
}
export async function removeWorkspaceRosterAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("remove", rawToken, formData);
}
export async function restoreWorkspaceRosterAction(
  rawToken: string,
  _state: RosterActionState,
  formData: FormData,
) {
  return runWorkspaceRoster("restore", rawToken, formData);
}
export async function searchWorkspacePlayersAction(
  rawToken: string,
  _state: RosterSearchState,
  formData: FormData,
): Promise<RosterSearchState> {
  const access = await workspaceContext(rawToken);
  if (!access)
    return {
      status: "error",
      message: "This workspace link is invalid or no longer available.",
      fieldErrors: {},
      values: {},
      results: [],
    };
  return runRosterSearch(access.submissionId, access.context, formData);
}

async function runWorkspaceMatch(
  operation: MatchOperation,
  rawToken: string,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await workspaceContext(rawToken);
  if (!access)
    return {
      status: "error",
      message: "This workspace link is invalid or no longer available.",
      fieldErrors: {},
      values: {},
    };
  const result = await runMatchMutation(
    operation,
    access.submissionId,
    access.context,
    formData,
  );
  if (result.status === "success") {
    revalidatePublicTournamentProjection();
    revalidatePath(`/workspace/${rawToken}`);
    revalidatePath(`/workspace/${rawToken}/matches`);
    revalidatePath(`/admin/submissions/${access.submissionId}`);
  }
  return result;
}

export async function createWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("create", rawToken, formData);
}
export async function updateWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("update", rawToken, formData);
}
export async function scheduleWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("schedule", rawToken, formData);
}
export async function startWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("start", rawToken, formData);
}
export async function postponeWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("postpone", rawToken, formData);
}
export async function completeWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("complete", rawToken, formData);
}
export async function walkoverWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("walkover", rawToken, formData);
}
export async function cancelWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("cancel", rawToken, formData);
}
export async function reopenWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("reopen", rawToken, formData);
}
export async function deleteWorkspaceMatchAction(
  rawToken: string,
  _state: MatchActionState,
  formData: FormData,
) {
  return runWorkspaceMatch("delete", rawToken, formData);
}
