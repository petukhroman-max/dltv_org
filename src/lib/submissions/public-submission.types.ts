import type { ParsedOrganizerInput } from "@/lib/domain/submission";
import type { ParsedTournamentSubmissionInput } from "@/lib/domain/submission";

export const publicSubmissionFieldNames = [
  "organization_name",
  "contact_name",
  "contact_email",
  "discord_username",
  "website_url",
  "tournament_name",
  "description",
  "region",
  "language",
  "start_date",
  "end_date",
  "timezone",
  "format",
  "prize_pool_text",
  "is_online",
  "max_teams",
  "registration_deadline",
  "registration_url",
  "bracket_url",
  "discord_url",
  "stream_url",
  "rules_url",
  "organizer_notes",
  "consent_to_publish",
] as const;

export type PublicSubmissionFieldName =
  (typeof publicSubmissionFieldNames)[number];

export type PublicSubmissionValues = Partial<
  Record<PublicSubmissionFieldName, string>
>;

export type PublicSubmissionActionState = {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors: Partial<Record<PublicSubmissionFieldName, string>>;
  values: PublicSubmissionValues;
  submissionId?: string;
};

export const initialPublicSubmissionState: PublicSubmissionActionState = {
  status: "idle",
  fieldErrors: {},
  values: {},
};

export type AtomicPublicSubmissionInput = {
  organizer: ParsedOrganizerInput;
  submission: ParsedTournamentSubmissionInput;
  consent: {
    consent_to_publish: true;
    consent_version: "v1";
  };
};

export type AtomicPublicSubmissionResult = {
  submission: {
    id: string;
    status: string;
  };
};

export type AtomicPublicSubmissionService = (
  input: AtomicPublicSubmissionInput,
) => Promise<AtomicPublicSubmissionResult>;
