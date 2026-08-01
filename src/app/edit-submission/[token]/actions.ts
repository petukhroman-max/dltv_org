"use server";

import "server-only";

import { redirect } from "next/navigation";

import { defaultLocale, isLocale, localizePath } from "@/i18n/config";
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
  if (result.status === "success") {
    const requestedLocale = formData.get("locale");
    const locale =
      typeof requestedLocale === "string" && isLocale(requestedLocale)
        ? requestedLocale
        : defaultLocale;
    redirect(localizePath(locale, "/edit-submission/success"));
  }
  return result;
}
