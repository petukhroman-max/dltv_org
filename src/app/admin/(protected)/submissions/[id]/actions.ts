"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import type { ModerationTargetStatus } from "@/lib/domain/moderation";
import {
  ModerationConflictError,
  ModerationError,
  ModerationValidationError,
  moderateTournamentSubmission,
} from "@/lib/moderation/moderation.service";
import type { ModerationActionState } from "@/lib/moderation/moderation-state";
import {
  createSubmissionEditLink,
  OrganizerEditError,
  revokeSubmissionEditLinks,
} from "@/lib/organizer-edit/organizer-edit.service";
import type { EditLinkActionState } from "@/lib/organizer-edit/organizer-edit.types";

const messages = {
  confirmationRequired: "Confirm this moderation action to continue.",
  conflict:
    "This submission was updated by another administrator. Refresh the page and try again.",
  generic: "We could not update this submission. Please try again.",
  success: "The submission was updated.",
} as const;

async function runModerationAction(
  targetStatus: ModerationTargetStatus,
  requiresConfirmation: boolean,
  formData: FormData,
): Promise<ModerationActionState> {
  const admin = await requireAdmin();

  if (requiresConfirmation && formData.get("confirmed") !== "on") {
    return {
      status: "error",
      fieldErrors: { confirmed: messages.confirmationRequired },
    };
  }

  const input = {
    submission_id: formData.get("submission_id"),
    expected_status: formData.get("expected_status"),
    target_status: targetStatus,
    reviewer_note: formData.get("reviewer_note"),
  };

  try {
    const result = await moderateTournamentSubmission(input, admin);
    revalidatePath("/admin/submissions");
    revalidatePath(`/admin/submissions/${result.submission_id}`);
    return { status: "success", message: messages.success };
  } catch (error) {
    if (error instanceof ModerationValidationError) {
      return {
        status: "error",
        fieldErrors: error.fieldErrors,
      };
    }
    if (error instanceof ModerationConflictError) {
      return { status: "conflict", message: messages.conflict };
    }
    if (error instanceof ModerationError) {
      return { status: "error", message: messages.generic };
    }
    return { status: "error", message: messages.generic };
  }
}

export async function approveSubmissionAction(
  _previousState: ModerationActionState,
  formData: FormData,
) {
  return runModerationAction("approved", true, formData);
}

export async function rejectSubmissionAction(
  _previousState: ModerationActionState,
  formData: FormData,
) {
  return runModerationAction("rejected", true, formData);
}

export async function requestChangesAction(
  _previousState: ModerationActionState,
  formData: FormData,
) {
  return runModerationAction("needs_changes", false, formData);
}

export async function publishSubmissionAction(
  _previousState: ModerationActionState,
  formData: FormData,
) {
  return runModerationAction("published", true, formData);
}

export async function createSubmissionEditLinkAction(
  _previousState: EditLinkActionState,
  formData: FormData,
): Promise<EditLinkActionState> {
  const admin = await requireAdmin();
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { status: "error", message: "Could not create an edit link." };
  }
  try {
    const result = await createSubmissionEditLink(submissionId, admin);
    revalidatePath(`/admin/submissions/${submissionId}`);
    return {
      status: "success",
      message: "A new organizer edit link was created.",
      editUrl: result.editUrl,
    };
  } catch (error) {
    if (error instanceof OrganizerEditError) {
      return { status: "error", message: "Could not create an edit link." };
    }
    return { status: "error", message: "Could not create an edit link." };
  }
}

export async function revokeSubmissionEditLinksAction(
  _previousState: EditLinkActionState,
  formData: FormData,
): Promise<EditLinkActionState> {
  const admin = await requireAdmin();
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { status: "error", message: "Could not revoke the edit link." };
  }
  try {
    const result = await revokeSubmissionEditLinks(submissionId, admin);
    revalidatePath(`/admin/submissions/${submissionId}`);
    return {
      status: "success",
      message:
        result.revoked_count > 0
          ? "The organizer edit link was revoked."
          : "There was no active edit link to revoke.",
    };
  } catch {
    return { status: "error", message: "Could not revoke the edit link." };
  }
}
