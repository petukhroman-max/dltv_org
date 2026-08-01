import "server-only";

import { z } from "zod";

import {
  createTournamentStageMutationSchema,
  deleteTournamentStageSchema,
  updateTournamentStageMutationSchema,
} from "@/lib/domain/tournament-stage";
import {
  createTournamentTeamMutationSchema,
  deleteTournamentTeamSchema,
  updateTournamentTeamMutationSchema,
} from "@/lib/domain/tournament-team";
import {
  appendScopedSlugSuffix,
  createScopedSlug,
} from "@/lib/domain/scoped-slug";
import type { OperationalAccessContext } from "@/lib/operational-workspace/access-context";
import {
  executeCreateStageRpc,
  executeCreateTeamRpc,
  executeDeleteStageRpc,
  executeDeleteTeamRpc,
  executeUpdateStageRpc,
  executeUpdateTeamRpc,
  listStageSlugs,
  listTeamSlugs,
  type RpcAccessArguments,
} from "@/lib/operational-workspace/operational-mutations.repository";
import type { Json } from "@/lib/supabase/database.types";

const serviceEnvelopeSchema = z.object({
  submissionId: z.uuid(),
  values: z.unknown(),
});
const adminContextSchema = z.object({
  kind: z.literal("admin"),
  identity: z.object({ userId: z.uuid(), email: z.email() }),
});
const workspaceContextSchema = z.object({
  kind: z.literal("organizer_workspace"),
  submissionId: z.uuid(),
  tokenId: z.uuid(),
});
const resultSchema = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  name: z.string(),
  slug: z.string().optional(),
  updated_at: z.string().optional(),
  deleted: z.boolean().optional(),
});

export class OperationalValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super("Operational input is invalid");
    this.name = "OperationalValidationError";
  }
}
export class OperationalConflictError extends Error {}
export class OperationalDependencyError extends Error {
  constructor(readonly entity: "stage" | "team") {
    super("Operational entity has dependencies");
  }
}
export class OperationalAuthorizationError extends Error {}
export class OperationalMutationError extends Error {}

function fieldErrors(error: z.ZodError) {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    result[String(issue.path[0] ?? "form")] ??= issue.message;
  }
  return result;
}

function parseContext(
  context: OperationalAccessContext,
  submissionId: string,
): RpcAccessArguments {
  const admin = adminContextSchema.safeParse(context);
  if (admin.success) {
    return {
      p_actor_type: "admin",
      p_actor_id: admin.data.identity.userId,
      p_workspace_token_id: null,
    };
  }
  const workspace = workspaceContextSchema.safeParse(context);
  if (workspace.success && workspace.data.submissionId === submissionId) {
    return {
      p_actor_type: "organizer_workspace",
      p_actor_id: null,
      p_workspace_token_id: workspace.data.tokenId,
    };
  }
  throw new OperationalAuthorizationError();
}

function toJson(value: unknown): Json {
  return value as Json;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
}
function errorMessage(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "";
}

function mapRpcError(error: unknown, entity: "stage" | "team"): never {
  if (
    error instanceof OperationalValidationError ||
    error instanceof OperationalConflictError ||
    error instanceof OperationalDependencyError ||
    error instanceof OperationalAuthorizationError ||
    error instanceof OperationalMutationError
  ) {
    throw error;
  }
  const code = errorCode(error);
  const message = errorMessage(error);
  if (code === "40001") throw new OperationalConflictError();
  if (code === "42501") throw new OperationalAuthorizationError();
  if (code === "23503" || message.includes("has_dependencies")) {
    throw new OperationalDependencyError(entity);
  }
  if (code === "23505" && message.includes("sequence")) {
    throw new OperationalValidationError({
      sequence_number: "A stage already uses this position.",
    });
  }
  if (code === "23505" && message.includes("team_name")) {
    throw new OperationalValidationError({
      name: "A team with this name already exists in the tournament.",
    });
  }
  throw new OperationalMutationError();
}

function nextSlug(name: string, existing: string[]) {
  const base = createScopedSlug(name);
  const used = new Set(existing);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(appendScopedSlugSuffix(base, suffix))) suffix += 1;
  return appendScopedSlugSuffix(base, suffix);
}

type Dependencies = {
  createStage: typeof executeCreateStageRpc;
  updateStage: typeof executeUpdateStageRpc;
  deleteStage: typeof executeDeleteStageRpc;
  createTeam: typeof executeCreateTeamRpc;
  updateTeam: typeof executeUpdateTeamRpc;
  deleteTeam: typeof executeDeleteTeamRpc;
  stageSlugs: typeof listStageSlugs;
  teamSlugs: typeof listTeamSlugs;
};

const defaults: Dependencies = {
  createStage: executeCreateStageRpc,
  updateStage: executeUpdateStageRpc,
  deleteStage: executeDeleteStageRpc,
  createTeam: executeCreateTeamRpc,
  updateTeam: executeUpdateTeamRpc,
  deleteTeam: executeDeleteTeamRpc,
  stageSlugs: listStageSlugs,
  teamSlugs: listTeamSlugs,
};

export async function createTournamentStage(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = createTournamentStageMutationSchema.safeParse(
    envelope.data.values,
  );
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  const access = parseContext(accessContext, envelope.data.submissionId);
  try {
    const slug = nextSlug(
      parsed.data.name,
      await dependencies.stageSlugs(envelope.data.submissionId),
    );
    return resultSchema.parse(
      await dependencies.createStage({
        p_submission_id: envelope.data.submissionId,
        p_payload: toJson({ ...parsed.data, slug }),
        ...access,
      }),
    );
  } catch (error) {
    mapRpcError(error, "stage");
  }
}

export async function updateTournamentStage(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = updateTournamentStageMutationSchema.safeParse(
    envelope.data.values,
  );
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  const { id, expected_updated_at, ...payload } = parsed.data;
  try {
    return resultSchema.parse(
      await dependencies.updateStage({
        p_submission_id: envelope.data.submissionId,
        p_stage_id: id,
        p_expected_updated_at: expected_updated_at,
        p_payload: toJson(payload),
        ...parseContext(accessContext, envelope.data.submissionId),
      }),
    );
  } catch (error) {
    mapRpcError(error, "stage");
  }
}

export async function deleteTournamentStage(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = deleteTournamentStageSchema.safeParse(envelope.data.values);
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  try {
    return resultSchema.parse(
      await dependencies.deleteStage({
        p_submission_id: envelope.data.submissionId,
        p_stage_id: parsed.data.id,
        p_expected_updated_at: parsed.data.expected_updated_at,
        ...parseContext(accessContext, envelope.data.submissionId),
      }),
    );
  } catch (error) {
    mapRpcError(error, "stage");
  }
}

export async function createTournamentTeam(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = createTournamentTeamMutationSchema.safeParse(
    envelope.data.values,
  );
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  try {
    const slug = nextSlug(
      parsed.data.name,
      await dependencies.teamSlugs(envelope.data.submissionId),
    );
    return resultSchema.parse(
      await dependencies.createTeam({
        p_submission_id: envelope.data.submissionId,
        p_payload: toJson({ ...parsed.data, slug, source: "manual" }),
        ...parseContext(accessContext, envelope.data.submissionId),
      }),
    );
  } catch (error) {
    mapRpcError(error, "team");
  }
}

export async function updateTournamentTeam(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = updateTournamentTeamMutationSchema.safeParse(
    envelope.data.values,
  );
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  const { id, expected_updated_at, ...payload } = parsed.data;
  try {
    return resultSchema.parse(
      await dependencies.updateTeam({
        p_submission_id: envelope.data.submissionId,
        p_team_id: id,
        p_expected_updated_at: expected_updated_at,
        p_payload: toJson(payload),
        ...parseContext(accessContext, envelope.data.submissionId),
      }),
    );
  } catch (error) {
    mapRpcError(error, "team");
  }
}

export async function deleteTournamentTeam(
  input: unknown,
  accessContext: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const envelope = serviceEnvelopeSchema.safeParse(input);
  if (!envelope.success)
    throw new OperationalValidationError(fieldErrors(envelope.error));
  const parsed = deleteTournamentTeamSchema.safeParse(envelope.data.values);
  if (!parsed.success)
    throw new OperationalValidationError(fieldErrors(parsed.error));
  try {
    return resultSchema.parse(
      await dependencies.deleteTeam({
        p_submission_id: envelope.data.submissionId,
        p_team_id: parsed.data.id,
        p_expected_updated_at: parsed.data.expected_updated_at,
        ...parseContext(accessContext, envelope.data.submissionId),
      }),
    );
  } catch (error) {
    mapRpcError(error, "team");
  }
}
