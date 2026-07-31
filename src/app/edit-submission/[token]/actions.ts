"use server";

import "server-only";

import { redirect } from "next/navigation";

import { processOrganizerResubmission } from "@/lib/organizer-edit/organizer-edit-form.service";
import { resubmitSubmissionWithToken } from "@/lib/organizer-edit/organizer-edit.service";
import type { OrganizerEditActionState } from "@/lib/organizer-edit/organizer-edit.types";

export async function resubmitTournamentAction(
  rawToken: string,
  _previousState: OrganizerEditActionState,
  formData: FormData,
): Promise<OrganizerEditActionState> {
  const result = await processOrganizerResubmission(
    rawToken,
    formData,
    resubmitSubmissionWithToken,
  );
  if (result.status === "success") redirect("/edit-submission/success");
  return result;
}
