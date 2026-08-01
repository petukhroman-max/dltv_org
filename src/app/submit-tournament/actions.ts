"use server";

import "server-only";

import { redirect } from "next/navigation";

import { defaultLocale, isLocale, localizePath } from "@/i18n/config";
import { createTournamentSubmissionWithOrganizer } from "@/lib/services/create-tournament-submission";
import { processPublicTournamentSubmission } from "@/lib/submissions/public-submission.service";
import type { PublicSubmissionActionState } from "@/lib/submissions/public-submission.types";

export async function submitTournamentAction(
  _previousState: PublicSubmissionActionState,
  formData: FormData,
): Promise<PublicSubmissionActionState> {
  const result = await processPublicTournamentSubmission(
    formData,
    createTournamentSubmissionWithOrganizer,
  );

  if (result.status === "success" && result.submissionId) {
    const requestedLocale = formData.get("locale");
    const locale =
      typeof requestedLocale === "string" && isLocale(requestedLocale)
        ? requestedLocale
        : defaultLocale;
    redirect(
      `${localizePath(locale, "/submit-tournament/success")}?id=${encodeURIComponent(result.submissionId)}`,
    );
  }

  return result;
}
