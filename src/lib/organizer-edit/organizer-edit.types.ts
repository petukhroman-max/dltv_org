import type { ParsedTournamentSubmissionInput } from "@/lib/domain/submission";

export const organizerEditFieldNames = [
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
  "is_online",
  "max_teams",
  "registration_deadline",
  "organizer_notes",
  "confirmed",
] as const;

export type OrganizerEditFieldName = (typeof organizerEditFieldNames)[number];
export type OrganizerEditValues = Partial<
  Record<OrganizerEditFieldName, string>
>;

export type OrganizerEditActionState = {
  status: "idle" | "error";
  formError?: string;
  fieldErrors: Partial<Record<OrganizerEditFieldName, string>>;
  values: OrganizerEditValues;
};

export const initialOrganizerEditActionState: OrganizerEditActionState = {
  status: "idle",
  fieldErrors: {},
  values: {},
};

export type EditableSubmission = ParsedTournamentSubmissionInput & {
  id: string;
  reviewer_notes: string | null;
};

export type EditTokenStatus = {
  id: string;
  state: "active" | "used" | "revoked" | "expired";
  expiresAt: string;
  createdAt: string;
};

export type EditLinkActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  editUrl?: string;
};

export const initialEditLinkActionState: EditLinkActionState = {
  status: "idle",
};
