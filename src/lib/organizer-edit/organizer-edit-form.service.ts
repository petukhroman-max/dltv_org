import type { ZodIssue } from "zod";

import { organizerEditSubmissionSchema } from "@/lib/organizer-edit/organizer-edit.schema";
import {
  organizerEditFieldNames,
  type OrganizerEditActionState,
  type OrganizerEditFieldName,
  type OrganizerEditValues,
} from "@/lib/organizer-edit/organizer-edit.types";
import type { ParsedTournamentSubmissionInput } from "@/lib/domain/submission";
import { tournamentSubmissionInputSchema } from "@/lib/domain/submission";

export const ORGANIZER_EDIT_MAX_BYTES = 32_768;

type ResubmitService = (
  token: string,
  submission: ParsedTournamentSubmissionInput,
) => Promise<unknown>;

function getString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function payloadSize(formData: FormData): number {
  const encoder = new TextEncoder();
  let bytes = 0;
  for (const [key, value] of formData.entries()) {
    bytes += encoder.encode(key).byteLength;
    bytes +=
      typeof value === "string" ? encoder.encode(value).byteLength : value.size;
  }
  return bytes;
}

function getValues(formData: FormData): OrganizerEditValues {
  return Object.fromEntries(
    organizerEditFieldNames.map((name) => [name, getString(formData, name)]),
  );
}

function mapIssues(issues: ZodIssue[]) {
  const errors: Partial<Record<OrganizerEditFieldName, string>> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      typeof field === "string" &&
      organizerEditFieldNames.includes(field as OrganizerEditFieldName) &&
      !errors[field as OrganizerEditFieldName]
    ) {
      errors[field as OrganizerEditFieldName] = issue.message;
    }
  }
  return errors;
}

function genericError(values: OrganizerEditValues): OrganizerEditActionState {
  return {
    status: "error",
    formError: "This edit link is invalid or no longer available.",
    fieldErrors: {},
    values,
  };
}

export async function processOrganizerResubmission(
  rawToken: string,
  formData: FormData,
  resubmit: ResubmitService,
): Promise<OrganizerEditActionState | { status: "success" }> {
  if (payloadSize(formData) > ORGANIZER_EDIT_MAX_BYTES) return genericError({});

  const values = getValues(formData);
  const submission = {
    ...Object.fromEntries(
      organizerEditFieldNames
        .filter(
          (name) => !["is_online", "max_teams", "confirmed"].includes(name),
        )
        .map((name) => [name, getString(formData, name)]),
    ),
    is_online: formData.get("is_online") === "on",
    max_teams:
      getString(formData, "max_teams").trim() === ""
        ? null
        : Number(getString(formData, "max_teams")),
    confirmed: formData.get("confirmed") === "on",
  };

  const parsed = organizerEditSubmissionSchema.safeParse(submission);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: mapIssues(parsed.error.issues),
      values,
    };
  }

  const editable = tournamentSubmissionInputSchema.parse(parsed.data);
  try {
    await resubmit(rawToken, editable);
    return { status: "success" };
  } catch {
    return genericError(values);
  }
}
