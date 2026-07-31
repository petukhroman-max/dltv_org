"use server";

import "server-only";

import { redirect } from "next/navigation";

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
    redirect(
      `/submit-tournament/success?id=${encodeURIComponent(result.submissionId)}`,
    );
  }

  return result;
}
