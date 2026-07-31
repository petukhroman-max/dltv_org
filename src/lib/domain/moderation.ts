import { z } from "zod";

import {
  canTransitionSubmissionStatus,
  submissionStatusSchema,
  type SubmissionStatus,
} from "@/lib/domain/submission";

export const moderationTargetStatuses = [
  "needs_changes",
  "approved",
  "rejected",
  "published",
] as const;

export const moderationTargetStatusSchema = z.enum(moderationTargetStatuses);
export type ModerationTargetStatus = z.infer<
  typeof moderationTargetStatusSchema
>;

export const adminSupportedTransitions = [
  ["submitted", "needs_changes"],
  ["submitted", "approved"],
  ["submitted", "rejected"],
  ["approved", "needs_changes"],
  ["approved", "published"],
  ["published", "needs_changes"],
] as const satisfies ReadonlyArray<
  readonly [SubmissionStatus, ModerationTargetStatus]
>;

const adminTransitionKeys: ReadonlySet<string> = new Set(
  adminSupportedTransitions.map(([from, to]) => `${from}:${to}`),
);

export function canAdminModerateSubmission(
  from: SubmissionStatus,
  to: ModerationTargetStatus,
): boolean {
  return (
    canTransitionSubmissionStatus(from, to) &&
    adminTransitionKeys.has(`${from}:${to}`)
  );
}

const reviewerNoteSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? null
      : typeof value === "string"
        ? value.trim()
        : value,
  z
    .string()
    .max(2000, "Reviewer note must be 2,000 characters or fewer.")
    .nullable()
    .optional()
    .default(null),
);

export const moderateSubmissionInputSchema = z
  .object({
    submission_id: z.uuid(),
    expected_status: submissionStatusSchema,
    target_status: moderationTargetStatusSchema,
    reviewer_note: reviewerNoteSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.target_status === "needs_changes" ||
        value.target_status === "rejected") &&
      !value.reviewer_note
    ) {
      context.addIssue({
        code: "custom",
        message: "Reviewer note is required.",
        path: ["reviewer_note"],
      });
    }

    if (
      !canAdminModerateSubmission(value.expected_status, value.target_status)
    ) {
      context.addIssue({
        code: "custom",
        message: "This moderation action is not available for this status.",
        path: ["target_status"],
      });
    }
  });

export type ModerateSubmissionInput = z.input<
  typeof moderateSubmissionInputSchema
>;
export type ParsedModerateSubmissionInput = z.output<
  typeof moderateSubmissionInputSchema
>;
