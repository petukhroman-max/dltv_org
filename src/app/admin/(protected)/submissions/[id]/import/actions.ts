"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/require-admin";
import { revalidatePublicTournamentProjection } from "@/lib/public-tournaments/public-operational.revalidation";
import { getTournamentSubmissionById } from "@/lib/repositories/tournament-submissions";
import {
  applyTournamentImportSession,
  cancelTournamentImportSession,
  confirmTournamentImportTimezone,
  createGoogleSheetsImportSession,
  createCustomMappedImportSession,
  createXlsxImportSession,
  resolveTournamentImportConflict,
  revalidateTournamentImportSession,
  TournamentImportError,
} from "@/lib/tournament-import/import.service";
import { importMappingFromFormData } from "@/lib/tournament-import/mapping-form";

async function context(submissionId: string) {
  const [identity, submission] = await Promise.all([
    requireAdmin(),
    getTournamentSubmissionById(submissionId),
  ]);
  if (!submission) redirect(`/admin/submissions/${submissionId}`);
  return {
    identity,
    submission,
    context: { kind: "admin" as const, identity },
  };
}

export async function uploadAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  let sessionId: string;
  try {
    const session =
      formData.get("sourceType") === "google_sheets"
        ? await createGoogleSheetsImportSession({
            submissionId,
            accessContext: resolved.context,
            url: String(formData.get("googleUrl") ?? ""),
            fallbackTimezone: resolved.submission.timezone || "UTC",
          })
        : await createXlsxImportSession({
            submissionId,
            accessContext: resolved.context,
            file: formData.get("workbook") as File,
            fallbackTimezone: resolved.submission.timezone || "UTC",
          });
    sessionId = session.id;
  } catch (error) {
    const code =
      error instanceof TournamentImportError ? error.code : "import_failed";
    redirect(
      `/admin/submissions/${submissionId}/import?error=${encodeURIComponent(code)}`,
    );
  }
  redirect(`/admin/submissions/${submissionId}/import?session=${sessionId}`);
}

export async function mapAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  try {
    const session = await createCustomMappedImportSession({
      submissionId,
      accessContext: resolved.context,
      file: formData.get("workbook") as File,
      fallbackTimezone: resolved.submission.timezone || "UTC",
      mapping: importMappingFromFormData(formData),
    });
    redirect(`/admin/submissions/${submissionId}/import?session=${session.id}`);
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_mapping_invalid";
    redirect(
      `/admin/submissions/${submissionId}/import?error=${encodeURIComponent(code)}`,
    );
  }
}

export async function resolveAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await resolveTournamentImportConflict({
      sessionId,
      rowId: String(formData.get("rowId") ?? ""),
      submissionId,
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
      `/admin/submissions/${submissionId}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  revalidatePath(`/admin/submissions/${submissionId}/import`);
  redirect(
    `/admin/submissions/${submissionId}/import?session=${sessionId}&filter=conflict&resolved=1`,
  );
}

export async function confirmAdminImportTimezoneAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    if (formData.get("confirmTimezone") !== "true")
      throw new TournamentImportError("import_timezone_confirmation_required");
    await confirmTournamentImportTimezone({
      sessionId,
      submissionId,
      context: resolved.context,
      timezone: formData.get("timezone"),
    });
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_timezone_confirmation_failed";
    redirect(
      `/admin/submissions/${submissionId}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  revalidatePath(`/admin/submissions/${submissionId}/import`);
  redirect(`/admin/submissions/${submissionId}/import?session=${sessionId}`);
}

export async function applyAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await applyTournamentImportSession(
      sessionId,
      submissionId,
      resolved.context,
    );
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_apply_failed";
    redirect(
      `/admin/submissions/${submissionId}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  await revalidatePublicTournamentProjection(submissionId);
  revalidatePath(`/admin/submissions/${submissionId}`);
  revalidatePath(`/admin/submissions/${submissionId}/import`);
  redirect(`/admin/submissions/${submissionId}/import?session=${sessionId}`);
}

export async function revalidateAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await revalidateTournamentImportSession(
      sessionId,
      submissionId,
      resolved.context,
    );
  } catch (error) {
    const code =
      error instanceof TournamentImportError
        ? error.code
        : "import_revalidation_failed";
    redirect(
      `/admin/submissions/${submissionId}/import?session=${sessionId}&error=${encodeURIComponent(code)}`,
    );
  }
  revalidatePath(`/admin/submissions/${submissionId}/import`);
  redirect(
    `/admin/submissions/${submissionId}/import?session=${sessionId}&revalidated=1`,
  );
}

export async function cancelAdminImportAction(
  submissionId: string,
  formData: FormData,
): Promise<void> {
  const resolved = await context(submissionId);
  const sessionId = String(formData.get("sessionId") ?? "");
  try {
    await cancelTournamentImportSession(
      sessionId,
      submissionId,
      resolved.context,
    );
  } catch {
    redirect(
      `/admin/submissions/${submissionId}/import?session=${sessionId}&error=import_cancel_failed`,
    );
  }
  revalidatePath(`/admin/submissions/${submissionId}/import`);
  redirect(`/admin/submissions/${submissionId}/import?session=${sessionId}`);
}
