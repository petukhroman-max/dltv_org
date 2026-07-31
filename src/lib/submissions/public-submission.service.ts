import type { ZodIssue } from "zod";

import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";
import {
  PUBLIC_SUBMISSION_CONSENT_VERSION,
  PUBLIC_SUBMISSION_MAX_BYTES,
  PUBLIC_SUBMISSION_MIN_FILL_MS,
  publicSubmissionSchema,
} from "@/lib/submissions/public-submission.schema";
import {
  publicSubmissionFieldNames,
  type AtomicPublicSubmissionService,
  type PublicSubmissionActionState,
  type PublicSubmissionFieldName,
  type PublicSubmissionValues,
} from "@/lib/submissions/public-submission.types";

const organizerFields = [
  "organization_name",
  "contact_name",
  "contact_email",
  "discord_username",
  "website_url",
] as const;

const tournamentFields = [
  "tournament_name",
  "description",
  "region",
  "language",
  "start_date",
  "end_date",
  "timezone",
  "format",
  "prize_pool_text",
  "registration_url",
  "bracket_url",
  "discord_url",
  "stream_url",
  "rules_url",
  "organizer_notes",
] as const;

function getString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function getPayloadSize(formData: FormData): number {
  let bytes = 0;
  const encoder = new TextEncoder();

  for (const [key, value] of formData.entries()) {
    bytes += encoder.encode(key).byteLength;
    bytes +=
      typeof value === "string" ? encoder.encode(value).byteLength : value.size;
  }

  return bytes;
}

function getValues(formData: FormData): PublicSubmissionValues {
  return Object.fromEntries(
    publicSubmissionFieldNames.map((name) => [name, getString(formData, name)]),
  );
}

function getValidationMessage(field: PublicSubmissionFieldName): string {
  return publicSubmissionCopy.errors.invalid[field];
}

function mapIssues(
  issues: ZodIssue[],
): Partial<Record<PublicSubmissionFieldName, string>> {
  const errors: Partial<Record<PublicSubmissionFieldName, string>> = {};

  for (const issue of issues) {
    const field = issue.path.at(-1);
    if (
      typeof field === "string" &&
      publicSubmissionFieldNames.includes(field as PublicSubmissionFieldName) &&
      !errors[field as PublicSubmissionFieldName]
    ) {
      errors[field as PublicSubmissionFieldName] = getValidationMessage(
        field as PublicSubmissionFieldName,
      );
    }
  }

  return errors;
}

function genericError(
  values: PublicSubmissionValues,
): PublicSubmissionActionState {
  return {
    status: "error",
    formError: publicSubmissionCopy.errors.generic,
    fieldErrors: {},
    values,
  };
}

export async function processPublicTournamentSubmission(
  formData: FormData,
  atomicService: AtomicPublicSubmissionService,
  now = Date.now(),
): Promise<PublicSubmissionActionState> {
  if (getPayloadSize(formData) > PUBLIC_SUBMISSION_MAX_BYTES) {
    return genericError({});
  }

  const values = getValues(formData);
  if (getString(formData, "company_fax").trim() !== "") {
    return genericError(values);
  }

  const renderedAt = Number(getString(formData, "rendered_at"));
  if (
    !Number.isFinite(renderedAt) ||
    renderedAt <= 0 ||
    now - renderedAt < PUBLIC_SUBMISSION_MIN_FILL_MS
  ) {
    return genericError(values);
  }

  const organizer = Object.fromEntries(
    organizerFields.map((name) => [name, getString(formData, name)]),
  );
  const submission = {
    ...Object.fromEntries(
      tournamentFields.map((name) => [name, getString(formData, name)]),
    ),
    is_online: formData.get("is_online") === "on",
    max_teams:
      getString(formData, "max_teams").trim() === ""
        ? null
        : Number(getString(formData, "max_teams")),
    registration_deadline: getString(formData, "registration_deadline"),
  };

  const parsed = publicSubmissionSchema.safeParse({
    organizer,
    submission,
    consent_to_publish: formData.get("consent_to_publish") === "on",
    rendered_at: renderedAt,
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: mapIssues(parsed.error.issues),
      values,
    };
  }

  try {
    const result = await atomicService({
      organizer: parsed.data.organizer,
      submission: parsed.data.submission,
      consent: {
        consent_to_publish: true,
        consent_version: PUBLIC_SUBMISSION_CONSENT_VERSION,
      },
    });

    if (result.submission.status !== "submitted" || !result.submission.id) {
      return genericError(values);
    }

    return {
      status: "success",
      submissionId: result.submission.id,
      fieldErrors: {},
      values: {},
    };
  } catch {
    return genericError(values);
  }
}
