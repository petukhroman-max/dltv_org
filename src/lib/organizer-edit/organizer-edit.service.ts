import "server-only";

import { z } from "zod";

import type { AdminIdentity } from "@/lib/admin/authorization";
import { serverEnv } from "@/lib/server-env";
import {
  findEditableSubmissionByHash,
  findLatestEditTokenForSubmission,
  executeCreateEditTokenRpc,
  executeResubmitRpc,
  executeRevokeEditTokensRpc,
  toResubmissionJson,
} from "@/lib/organizer-edit/organizer-edit.repository";
import type {
  EditableSubmission,
  EditTokenStatus,
} from "@/lib/organizer-edit/organizer-edit.types";
import {
  EDIT_TOKEN_TTL_MS,
  generateEditToken,
  hashEditToken,
} from "@/lib/organizer-edit/token";
import type { ParsedTournamentSubmissionInput } from "@/lib/domain/submission";

const idSchema = z.uuid();
const adminSchema = z.object({ userId: z.uuid(), email: z.email() });
const createResultSchema = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  expires_at: z.string(),
  created_at: z.string(),
});
const revokeResultSchema = z.object({
  submission_id: z.uuid(),
  revoked_count: z.number().int().nonnegative(),
});
const resubmitResultSchema = z.object({
  submission_id: z.uuid(),
  status: z.literal("submitted"),
  submitted_at: z.string(),
});

export class OrganizerEditError extends Error {
  constructor() {
    super("Organizer edit operation failed");
    this.name = "OrganizerEditError";
  }
}

export async function createSubmissionEditLink(
  submissionId: string,
  admin: AdminIdentity,
  now = new Date(),
  executeRpc = executeCreateEditTokenRpc,
  createToken = generateEditToken,
  appUrl = serverEnv.NEXT_PUBLIC_APP_URL,
) {
  const id = idSchema.safeParse(submissionId);
  const identity = adminSchema.safeParse(admin);
  if (!id.success || !identity.success || !appUrl) {
    throw new OrganizerEditError();
  }

  const rawToken = createToken();
  const expiresAt = new Date(now.getTime() + EDIT_TOKEN_TTL_MS);
  try {
    const result = createResultSchema.parse(
      await executeRpc({
        p_submission_id: id.data,
        p_token_hash: hashEditToken(rawToken),
        p_expires_at: expiresAt.toISOString(),
        p_created_by: identity.data.userId,
      }),
    );
    const editUrl = new URL(`/edit-submission/${rawToken}`, appUrl).toString();
    return { ...result, editUrl };
  } catch {
    throw new OrganizerEditError();
  }
}

export async function revokeSubmissionEditLinks(
  submissionId: string,
  admin: AdminIdentity,
  executeRpc = executeRevokeEditTokensRpc,
) {
  const id = idSchema.safeParse(submissionId);
  const identity = adminSchema.safeParse(admin);
  if (!id.success || !identity.success) throw new OrganizerEditError();
  try {
    return revokeResultSchema.parse(
      await executeRpc({
        p_submission_id: id.data,
        p_reviewer_id: identity.data.userId,
      }),
    );
  } catch {
    throw new OrganizerEditError();
  }
}

export async function getEditableSubmissionByToken(
  rawToken: string,
  findByHash = findEditableSubmissionByHash,
): Promise<EditableSubmission | null> {
  try {
    return await findByHash(hashEditToken(rawToken));
  } catch {
    return null;
  }
}

export async function getSubmissionEditTokenStatus(
  submissionId: string,
  findLatest = findLatestEditTokenForSubmission,
  now = new Date(),
): Promise<EditTokenStatus | null> {
  const id = idSchema.safeParse(submissionId);
  if (!id.success) return null;
  const token = await findLatest(id.data);
  if (!token) return null;
  const state = token.used_at
    ? "used"
    : token.revoked_at
      ? "revoked"
      : new Date(token.expires_at).getTime() <= now.getTime()
        ? "expired"
        : "active";
  return {
    id: token.id,
    state,
    expiresAt: token.expires_at,
    createdAt: token.created_at,
  };
}

export async function resubmitSubmissionWithToken(
  rawToken: string,
  submission: ParsedTournamentSubmissionInput,
  executeRpc = executeResubmitRpc,
) {
  try {
    return resubmitResultSchema.parse(
      await executeRpc({
        p_token_hash: hashEditToken(rawToken),
        p_submission: toResubmissionJson(submission),
      }),
    );
  } catch {
    throw new OrganizerEditError();
  }
}
