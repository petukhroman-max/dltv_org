"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  createWorkspaceLink,
  revokeWorkspaceLink,
  WorkspaceLinkError,
} from "@/lib/organizer-workspace/workspace-token.service";
import type { WorkspaceLinkActionState } from "@/lib/organizer-workspace/workspace-token.types";

export async function createWorkspaceLinkAction(
  _previousState: WorkspaceLinkActionState,
  formData: FormData,
): Promise<WorkspaceLinkActionState> {
  const admin = await requireAdmin();
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { status: "error", message: "Could not create a workspace link." };
  }
  try {
    const result = await createWorkspaceLink(
      submissionId,
      admin,
      formData.get("expiration_days"),
      formData.get("label"),
    );
    revalidatePath(`/admin/submissions/${submissionId}`);
    return {
      status: "success",
      message: result.rotated
        ? "The workspace link was rotated."
        : "The workspace link was created.",
      workspaceUrl: result.workspaceUrl,
    };
  } catch (error) {
    if (error instanceof WorkspaceLinkError) {
      return { status: "error", message: "Could not create a workspace link." };
    }
    return { status: "error", message: "Could not create a workspace link." };
  }
}

export async function revokeWorkspaceLinkAction(
  _previousState: WorkspaceLinkActionState,
  formData: FormData,
): Promise<WorkspaceLinkActionState> {
  const admin = await requireAdmin();
  const submissionId = formData.get("submission_id");
  if (typeof submissionId !== "string") {
    return { status: "error", message: "Could not revoke the workspace link." };
  }
  try {
    const result = await revokeWorkspaceLink(submissionId, admin);
    revalidatePath(`/admin/submissions/${submissionId}`);
    return {
      status: "success",
      message:
        result.revoked_count > 0
          ? "The workspace link was revoked."
          : "There was no active workspace link to revoke.",
    };
  } catch {
    return { status: "error", message: "Could not revoke the workspace link." };
  }
}
