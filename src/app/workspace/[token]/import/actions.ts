"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { revalidatePublicTournamentProjection } from "@/lib/public-tournaments/public-operational.revalidation";
import {
  applyTournamentImportSession,
  cancelTournamentImportSession,
  confirmTournamentImportTimezone,
  createGoogleSheetsImportSession,
  createCustomMappedImportSession,
  createXlsxImportSession,
  resolveTournamentImportConflict,
  TournamentImportError,
} from "@/lib/tournament-import/import.service";
import { importMappingFromFormData } from "@/lib/tournament-import/mapping-form";

async function context(rawToken: string) {
  const access = await validateWorkspaceAccess(rawToken);
  if (!access) return null;
  return {
    access,
    context: {
      kind: "organizer_workspace" as const,
      submissionId: access.submission.id,
      tokenId: access.tokenId,
    },
  };
}

export async function uploadWorkspaceImportAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  let sessionId: string;
  try {
    const sourceType = formData.get("sourceType");
    const session =
      sourceType === "google_sheets"
        ? await createGoogleSheetsImportSession({
            submissionId: resolved.access.submission.id,
            accessContext: resolved.context,
            url: String(formData.get("googleUrl") ?? ""),
            fallbackTimezone: resolved.access.submission.timezone || "UTC",
          })
        : await createXlsxImportSession({
            submissionId: resolved.access.submission.id,
            accessContext: resolved.context,
            file: formData.get("workbook") as File,
            fallbackTimezone: resolved.access.submission.timezone || "UTC",
          });
    sessionId = session.id;
  } catch (error) {
    const code =
      error instanceof TournamentImportError ? error.code : "import_failed";
    redirect(`/workspace/${rawToken}/import?error=${encodeURIComponent(code)}`);
  }
  redirect(`/workspace/${rawToken}/import?session=${sessionId}`);
}

export async function mapWorkspaceImportAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  try {
    const session = await createCustomMappedImportSession({
      submissionId: resolved.access.submission.id,
      accessContext: resolved.context,
      file: formData.get("workbook") as File,
      fallbackTimezone: resolved.access.submission.timezone || "UTC",
      mapping: importMappingFromFormData(formData),
    });
    redirect(`/workspace/${rawToken}/import?session=${session.id}`);
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_mapping_invalid";
    redirect(`/workspace/${rawToken}/import?error=${encodeURIComponent(code)}`);
  }
}

export async function resolveWorkspaceImportAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await resolveTournamentImportConflict({
      sessionId,
      rowId: String(formData.get("rowId") ?? ""),
      submissionId: resolved.access.submission.id,
      context: resolved.context,
      expectedSessionUpdatedAt: formData.get("sessionVersion"),
      resolution: {
        decision: formData.get("decision"),
        existingEntityId:
          String(formData.get("existingEntityId") ?? "").trim() || null,
        confirmedCompletedResultOverwrite:
          formData.get("confirmedCompletedResultOverwrite") === "true",
      },
    });
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_resolution_failed";
    redirect(
      `/workspace/${rawToken}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  revalidatePath(`/workspace/${rawToken}/import`);
  redirect(
    `/workspace/${rawToken}/import?session=${sessionId}&filter=conflict&resolved=1`,
  );
}

export async function confirmWorkspaceImportTimezoneAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    if (formData.get("confirmTimezone") !== "true")
      throw new TournamentImportError("import_timezone_confirmation_required");
    await confirmTournamentImportTimezone({
      sessionId,
      submissionId: resolved.access.submission.id,
      context: resolved.context,
      timezone: formData.get("timezone"),
    });
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_timezone_confirmation_failed";
    redirect(
      `/workspace/${rawToken}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  revalidatePath(`/workspace/${rawToken}/import`);
  redirect(`/workspace/${rawToken}/import?session=${sessionId}`);
}

export async function applyWorkspaceImportAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await applyTournamentImportSession(
      sessionId,
      resolved.access.submission.id,
      resolved.context,
    );
  } catch {
    redirect(
      `/workspace/${rawToken}/import?session=${sessionId}&error=import_apply_failed`,
    );
  }
  await revalidatePublicTournamentProjection(resolved.access.submission.id);
  revalidatePath(`/workspace/${rawToken}`);
  revalidatePath(`/workspace/${rawToken}/matches`);
  revalidatePath(`/workspace/${rawToken}/import`);
  revalidatePath(`/admin/submissions/${resolved.access.submission.id}`);
  redirect(`/workspace/${rawToken}/import?session=${sessionId}`);
}

export async function cancelWorkspaceImportAction(
  rawToken: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(rawToken);
  if (!resolved)
    redirect(`/workspace/${rawToken}/import?error=workspace_access_invalid`);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await cancelTournamentImportSession(
      sessionId,
      resolved.access.submission.id,
      resolved.context,
    );
  } catch {
    redirect(
      `/workspace/${rawToken}/import?session=${sessionId}&error=import_cancel_failed`,
    );
  }
  revalidatePath(`/workspace/${rawToken}/import`);
  redirect(`/workspace/${rawToken}/import?session=${sessionId}`);
}
