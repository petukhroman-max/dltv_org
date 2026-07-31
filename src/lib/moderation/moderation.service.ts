import "server-only";

import { z } from "zod";

import type { AdminIdentity } from "@/lib/admin/authorization";
import {
  moderateSubmissionInputSchema,
  moderationTargetStatusSchema,
  type ParsedModerateSubmissionInput,
} from "@/lib/domain/moderation";
import { submissionStatusSchema } from "@/lib/domain/submission";
import {
  executeModerationRpc,
  type ModerationRpcArguments,
} from "@/lib/moderation/moderation.repository";

const adminIdentitySchema = z.object({
  userId: z.uuid(),
  email: z.email(),
});

const moderationResultSchema = z.object({
  submission_id: z.uuid(),
  previous_status: submissionStatusSchema,
  status: moderationTargetStatusSchema,
  updated_at: z.string(),
  reviewed_at: z.string().nullable(),
  published_at: z.string().nullable(),
  public_tournament_id: z.uuid().nullable().optional(),
  slug: z.string().nullable().optional(),
});

export type ModerationResult = z.infer<typeof moderationResultSchema>;

export class ModerationValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Moderation input is invalid");
    this.name = "ModerationValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class ModerationConflictError extends Error {
  constructor() {
    super("Submission status changed");
    this.name = "ModerationConflictError";
  }
}

export class ModerationError extends Error {
  constructor() {
    super("Moderation failed");
    this.name = "ModerationError";
  }
}

type ModerationRpcExecutor = (args: ModerationRpcArguments) => Promise<unknown>;

function toFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    errors[field] ??= issue.message;
  }
  return errors;
}

function isConflictError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "40001"
  );
}

export async function moderateTournamentSubmission(
  input: unknown,
  adminIdentity: AdminIdentity,
  executeRpc: ModerationRpcExecutor = executeModerationRpc,
): Promise<ModerationResult> {
  const parsedIdentity = adminIdentitySchema.safeParse(adminIdentity);
  const parsedInput = moderateSubmissionInputSchema.safeParse(input);

  if (!parsedIdentity.success) {
    throw new ModerationError();
  }
  if (!parsedInput.success) {
    throw new ModerationValidationError(toFieldErrors(parsedInput.error));
  }

  const value: ParsedModerateSubmissionInput = parsedInput.data;
  const rpcArguments: ModerationRpcArguments = {
    p_submission_id: value.submission_id,
    p_expected_status: value.expected_status,
    p_target_status: value.target_status,
    p_reviewer_id: parsedIdentity.data.userId,
    p_reviewer_note: value.reviewer_note,
  };

  let result: unknown;
  try {
    result = await executeRpc(rpcArguments);
  } catch (error) {
    if (isConflictError(error)) {
      throw new ModerationConflictError();
    }
    throw new ModerationError();
  }

  const parsedResult = moderationResultSchema.safeParse(result);
  if (!parsedResult.success) {
    throw new ModerationError();
  }

  return parsedResult.data;
}
