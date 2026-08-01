import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { z } from "zod";

import type { AdminIdentity } from "@/lib/admin/authorization";
import {
  executeCreateWorkspaceTokenRpc,
  executeRevokeWorkspaceTokenRpc,
  executeValidateWorkspaceAccessRpc,
  findLatestWorkspaceToken,
  touchWorkspaceToken,
} from "@/lib/organizer-workspace/workspace-token.repository";
import {
  workspaceTokenExpirationDaysSchema,
  workspaceTokenSchema,
} from "@/lib/organizer-workspace/workspace-token.schema";
import type {
  WorkspaceAccess,
  WorkspaceTokenStatus,
} from "@/lib/organizer-workspace/workspace-token.types";
import { serverEnv } from "@/lib/server-env";

const uuidSchema = z.uuid();
const adminSchema = z.object({ userId: z.uuid(), email: z.email() });
const labelSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).max(100).nullable().default(null),
);
const createResultSchema = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  expires_at: z.string(),
  created_at: z.string(),
  rotated: z.boolean(),
});
const revokeResultSchema = z.object({
  submission_id: z.uuid(),
  revoked_count: z.number().int().nonnegative(),
});
const accessResultSchema = z.object({
  token_id: z.uuid(),
  submission: z.object({
    id: z.uuid(),
    tournament_name: z.string(),
    status: z.string(),
    region: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    timezone: z.string(),
    format: z.string().nullable(),
  }),
});

export class WorkspaceLinkError extends Error {
  constructor() {
    super("Workspace link operation failed");
    this.name = "WorkspaceLinkError";
  }
}

export function generateWorkspaceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashWorkspaceToken(rawToken: string): string {
  const token = workspaceTokenSchema.parse(rawToken);
  return createHash("sha256").update(token, "utf8").digest("hex");
}

type CreateDependencies = {
  executeRpc: typeof executeCreateWorkspaceTokenRpc;
  generateToken: typeof generateWorkspaceToken;
  appUrl: string | undefined;
};

export async function createWorkspaceLink(
  submissionId: string,
  admin: AdminIdentity,
  expirationDays: unknown = 30,
  label: unknown = null,
  now = new Date(),
  dependencies: CreateDependencies = {
    executeRpc: executeCreateWorkspaceTokenRpc,
    generateToken: generateWorkspaceToken,
    appUrl: serverEnv.NEXT_PUBLIC_APP_URL,
  },
) {
  const id = uuidSchema.safeParse(submissionId);
  const identity = adminSchema.safeParse(admin);
  const days = workspaceTokenExpirationDaysSchema.safeParse(expirationDays);
  const parsedLabel = labelSchema.safeParse(label);
  if (
    !id.success ||
    !identity.success ||
    !days.success ||
    !parsedLabel.success ||
    !dependencies.appUrl
  ) {
    throw new WorkspaceLinkError();
  }

  const rawToken = dependencies.generateToken();
  const token = workspaceTokenSchema.safeParse(rawToken);
  if (!token.success) throw new WorkspaceLinkError();
  const expiresAt = new Date(now.getTime() + days.data * 24 * 60 * 60 * 1_000);

  try {
    const result = createResultSchema.parse(
      await dependencies.executeRpc({
        p_submission_id: id.data,
        p_token_hash: hashWorkspaceToken(token.data),
        p_label: parsedLabel.data,
        p_expires_at: expiresAt.toISOString(),
        p_created_by: identity.data.userId,
      }),
    );
    const workspaceUrl = new URL(
      `/workspace/${token.data}`,
      dependencies.appUrl,
    ).toString();
    return { ...result, workspaceUrl };
  } catch {
    throw new WorkspaceLinkError();
  }
}

export async function revokeWorkspaceLink(
  submissionId: string,
  admin: AdminIdentity,
  executeRpc = executeRevokeWorkspaceTokenRpc,
) {
  const id = uuidSchema.safeParse(submissionId);
  const identity = adminSchema.safeParse(admin);
  if (!id.success || !identity.success) throw new WorkspaceLinkError();
  try {
    return revokeResultSchema.parse(
      await executeRpc({
        p_submission_id: id.data,
        p_reviewer_id: identity.data.userId,
      }),
    );
  } catch {
    throw new WorkspaceLinkError();
  }
}

type ValidationDependencies = {
  validateHash: typeof executeValidateWorkspaceAccessRpc;
};

export async function validateWorkspaceAccess(
  rawToken: string,
  dependencies: ValidationDependencies = {
    validateHash: executeValidateWorkspaceAccessRpc,
  },
  now = new Date(),
): Promise<WorkspaceAccess | null> {
  const parsedToken = workspaceTokenSchema.safeParse(rawToken);
  if (!parsedToken.success) return null;

  try {
    const tokenHash = hashWorkspaceToken(parsedToken.data);
    void now;
    const result = accessResultSchema.safeParse(
      await dependencies.validateHash(tokenHash),
    );
    if (!result.success) return null;
    return {
      tokenId: result.data.token_id,
      submission: result.data.submission,
    };
  } catch {
    return null;
  }
}

export async function touchWorkspaceLastUsed(
  tokenId: string,
  rawToken: string,
  now = new Date(),
  touch = touchWorkspaceToken,
) {
  const id = uuidSchema.safeParse(tokenId);
  const token = workspaceTokenSchema.safeParse(rawToken);
  if (!id.success || !token.success) throw new WorkspaceLinkError();
  try {
    await touch(id.data, hashWorkspaceToken(token.data), now.toISOString());
  } catch {
    throw new WorkspaceLinkError();
  }
}

export async function getWorkspaceTokenStatus(
  submissionId: string,
  findLatest = findLatestWorkspaceToken,
  now = new Date(),
): Promise<WorkspaceTokenStatus | null> {
  const id = uuidSchema.safeParse(submissionId);
  if (!id.success) return null;
  const token = await findLatest(id.data);
  if (!token) return null;
  return {
    id: token.id,
    state: token.revoked_at
      ? "revoked"
      : new Date(token.expires_at).getTime() <= now.getTime()
        ? "expired"
        : "active",
    label: token.label,
    expiresAt: token.expires_at,
    lastUsedAt: token.last_used_at,
    createdAt: token.created_at,
  };
}
