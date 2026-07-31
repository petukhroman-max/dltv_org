import { z } from "zod";

export const submissionStatuses = [
  "draft",
  "submitted",
  "needs_changes",
  "approved",
  "published",
  "rejected",
] as const;

export const submissionStatusSchema = z.enum(submissionStatuses);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const submissionActorTypes = ["organizer", "admin", "system"] as const;
export const submissionActorTypeSchema = z.enum(submissionActorTypes);

const trimmedRequiredText = z.string().trim().min(1);
const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? null
      : typeof value === "string"
        ? value.trim()
        : value,
  z.string().min(1).nullable().optional().default(null),
);
const optionalHttpUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? null
      : typeof value === "string"
        ? value.trim()
        : value,
  z
    .url()
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, "URL must use http or https")
    .nullable()
    .optional()
    .default(null),
);
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Date is invalid");
const timezoneSchema = trimmedRequiredText.refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}, "Timezone must be a valid IANA timezone");
const offsetDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => /(?:Z|[+-]\d{2}:\d{2})$/.test(value),
    "Datetime must include a timezone offset",
  );

export const organizerInputSchema = z.object({
  organization_name: trimmedRequiredText,
  contact_name: trimmedRequiredText,
  contact_email: z.string().trim().toLowerCase().pipe(z.email()),
  discord_username: optionalText,
  website_url: optionalHttpUrl,
});
export type OrganizerInput = z.input<typeof organizerInputSchema>;
export type ParsedOrganizerInput = z.output<typeof organizerInputSchema>;

export const tournamentSubmissionInputSchema = z
  .object({
    tournament_name: trimmedRequiredText,
    description: optionalText,
    region: trimmedRequiredText,
    language: optionalText,
    start_date: dateOnlySchema,
    end_date: dateOnlySchema,
    timezone: timezoneSchema,
    format: optionalText,
    prize_pool_text: optionalText,
    registration_url: optionalHttpUrl,
    bracket_url: optionalHttpUrl,
    discord_url: optionalHttpUrl,
    stream_url: optionalHttpUrl,
    rules_url: optionalHttpUrl,
    is_online: z.boolean().default(true),
    max_teams: z.number().int().positive().nullable().optional().default(null),
    registration_deadline: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      offsetDateTimeSchema.nullable().optional().default(null),
    ),
    organizer_notes: optionalText,
  })
  .refine((value) => value.end_date >= value.start_date, {
    message: "End date must not be before start date",
    path: ["end_date"],
  });
export type TournamentSubmissionInput = z.input<
  typeof tournamentSubmissionInputSchema
>;
export type ParsedTournamentSubmissionInput = z.output<
  typeof tournamentSubmissionInputSchema
>;

export const createTournamentSubmissionInputSchema =
  tournamentSubmissionInputSchema.safeExtend({
    organizer_id: z.uuid(),
  });

export const submissionEventInputSchema = z.object({
  submission_id: z.uuid(),
  event_type: trimmedRequiredText,
  from_status: submissionStatusSchema.nullable().optional().default(null),
  to_status: submissionStatusSchema.nullable().optional().default(null),
  actor_type: submissionActorTypeSchema,
  actor_id: z.uuid().nullable().optional().default(null),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const listFiltersSchema = z
  .object({
    status: submissionStatusSchema.optional(),
    organizer_id: z.uuid().optional(),
    start_date_from: dateOnlySchema.optional(),
    start_date_to: dateOnlySchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
    offset: z.number().int().min(0).default(0),
  })
  .refine(
    (value) =>
      !value.start_date_from ||
      !value.start_date_to ||
      value.start_date_to >= value.start_date_from,
    {
      message: "Start date range is invalid",
      path: ["start_date_to"],
    },
  );
export type ListFilters = z.input<typeof listFiltersSchema>;

export const statusTransitionInputSchema = z.object({
  from: submissionStatusSchema,
  to: submissionStatusSchema,
});

const allowedTransitions: ReadonlySet<string> = new Set([
  "draft:submitted",
  "submitted:needs_changes",
  "submitted:approved",
  "submitted:rejected",
  "needs_changes:submitted",
  "approved:published",
  "approved:needs_changes",
  "published:needs_changes",
]);

export class SubmissionStatusTransitionError extends Error {
  constructor() {
    super("Submission status transition is not allowed");
    this.name = "SubmissionStatusTransitionError";
  }
}

export function canTransitionSubmissionStatus(
  from: SubmissionStatus,
  to: SubmissionStatus,
): boolean {
  return from !== to && allowedTransitions.has(`${from}:${to}`);
}

export function assertSubmissionStatusTransition(
  from: SubmissionStatus,
  to: SubmissionStatus,
): void {
  if (!canTransitionSubmissionStatus(from, to)) {
    throw new SubmissionStatusTransitionError();
  }
}
