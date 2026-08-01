import "server-only";

import { z } from "zod";

import {
  cancelMatchSchema,
  canTransitionMatch,
  completeMatchSchema,
  createTournamentMatchSchema,
  createTournamentMatchMutationSchema,
  createWalkoverSchema,
  deleteMatchSchema,
  matchFiltersSchema,
  reopenMatchSchema,
  tournamentMatchStatusSchema,
  updateMatchStatusSchema,
  updateTournamentMatchMutationSchema,
  type OrganizerTournamentMatch,
  type TournamentMatchReadModel,
  type TournamentMatchStatus,
} from "@/lib/domain/tournament-match";
import {
  toOperationalRpcAccess,
  type OperationalAccessContext,
} from "@/lib/operational-workspace/access-context";
import {
  executeCancelMatchRpc,
  executeCompleteMatchRpc,
  executeCreateMatchRpc,
  executeDeleteMatchRpc,
  executeReopenMatchRpc,
  executeUpdateMatchRpc,
  executeUpdateMatchStatusRpc,
  selectTournamentMatch,
  selectTournamentMatches,
} from "@/lib/operational-workspace/match.repository";
import type { Json } from "@/lib/supabase/database.types";
import { logOperationalMutationFailure } from "@/lib/operational-workspace/operational-diagnostics";

const envelopeSchema = z.object({
  submissionId: z.uuid(),
  values: z.unknown(),
});
const resultSchema = z.object({
  id: z.uuid(),
  submission_id: z.uuid(),
  status: tournamentMatchStatusSchema.optional(),
  updated_at: z.string().optional(),
  deleted: z.boolean().optional(),
});

export type MatchErrorCode =
  | "MATCH_STALE_UPDATE"
  | "MATCH_TRANSITION_INVALID"
  | "MATCH_DELETE_HAS_HISTORY"
  | "MATCH_NOT_FOUND"
  | "MATCH_NUMBER_CONFLICT"
  | "MATCH_DEADLOCK_ID_CONFLICT"
  | "MATCH_SCOPE_INVALID"
  | "MATCH_ACCESS_DENIED"
  | "MATCH_MUTATION_FAILED";

export class MatchValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super("Match input is invalid");
  }
}
export class MatchApplicationError extends Error {
  constructor(readonly code: MatchErrorCode) {
    super(code);
  }
}

function toFieldErrors(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  );
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new MatchValidationError(toFieldErrors(parsed.error));
  return parsed.data;
}

function asJson(value: unknown) {
  return value as Json;
}

function omitRuntimeFields(
  value: Record<string, unknown>,
  blocked: ReadonlySet<string>,
) {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !blocked.has(key)),
  );
}

function message(error: unknown) {
  return typeof error === "object" && error && "message" in error
    ? String(error.message)
    : "";
}
function code(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
}

function stableErrorCode(error: unknown): MatchErrorCode {
  const errorMessage = message(error);
  if (code(error) === "40001" || errorMessage.includes("match_stale_update"))
    return "MATCH_STALE_UPDATE";
  if (code(error) === "42501") return "MATCH_ACCESS_DENIED";
  if (errorMessage.includes("match_transition_invalid"))
    return "MATCH_TRANSITION_INVALID";
  if (errorMessage.includes("match_delete_has_history"))
    return "MATCH_DELETE_HAS_HISTORY";
  if (errorMessage.includes("match_number_conflict"))
    return "MATCH_NUMBER_CONFLICT";
  if (errorMessage.includes("match_deadlock_id_conflict"))
    return "MATCH_DEADLOCK_ID_CONFLICT";
  if (
    code(error) === "23514" &&
    errorMessage.includes("must belong to the same tournament submission")
  )
    return "MATCH_SCOPE_INVALID";
  return "MATCH_MUTATION_FAILED";
}

function mapError(
  error: unknown,
  diagnostic: {
    operation: string;
    submissionId: string;
    matchId?: string;
  },
): never {
  if (
    error instanceof MatchValidationError ||
    error instanceof MatchApplicationError
  )
    throw error;
  const stableCode = stableErrorCode(error);
  logOperationalMutationFailure({
    operation: diagnostic.operation,
    submissionId: diagnostic.submissionId,
    entityIds: diagnostic.matchId ? { match_id: diagnostic.matchId } : {},
    stableCode,
    databaseCode: code(error),
  });
  throw new MatchApplicationError(stableCode);
}

type Dependencies = {
  list: typeof selectTournamentMatches;
  get: typeof selectTournamentMatch;
  create: typeof executeCreateMatchRpc;
  update: typeof executeUpdateMatchRpc;
  status: typeof executeUpdateMatchStatusRpc;
  complete: typeof executeCompleteMatchRpc;
  cancel: typeof executeCancelMatchRpc;
  reopen: typeof executeReopenMatchRpc;
  remove: typeof executeDeleteMatchRpc;
};
const defaults: Dependencies = {
  list: selectTournamentMatches,
  get: selectTournamentMatch,
  create: executeCreateMatchRpc,
  update: executeUpdateMatchRpc,
  status: executeUpdateMatchStatusRpc,
  complete: executeCompleteMatchRpc,
  cancel: executeCancelMatchRpc,
  reopen: executeReopenMatchRpc,
  remove: executeDeleteMatchRpc,
};

function access(context: OperationalAccessContext, submissionId: string) {
  try {
    return toOperationalRpcAccess(context, submissionId);
  } catch {
    throw new MatchApplicationError("MATCH_ACCESS_DENIED");
  }
}

function envelope(input: unknown) {
  return parse(envelopeSchema, input);
}

function scheduledDateKey(match: TournamentMatchReadModel) {
  if (!match.scheduled_at) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: match.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(match.scheduled_at));
    const value = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return `${value.year}-${value.month}-${value.day}`;
  } catch {
    return match.scheduled_at.slice(0, 10);
  }
}

async function currentMatch(
  submissionId: string,
  matchId: string,
  context: OperationalAccessContext,
  dependencies: Dependencies,
) {
  access(context, submissionId);
  const current = await dependencies.get(submissionId, matchId);
  if (!current) throw new MatchApplicationError("MATCH_NOT_FOUND");
  return current as TournamentMatchReadModel;
}

export async function listTournamentMatches(
  submissionId: string,
  context: OperationalAccessContext,
  filters: unknown = {},
  dependencies: Dependencies = defaults,
): Promise<OrganizerTournamentMatch[]> {
  const id = z.uuid().parse(submissionId);
  access(context, id);
  const parsedFilters = parse(matchFiltersSchema, filters);
  const rows = (await dependencies.list(id)) as TournamentMatchReadModel[];
  return rows
    .filter(
      (row) =>
        !parsedFilters.stage_id || row.stage_id === parsedFilters.stage_id,
    )
    .filter(
      (row) => !parsedFilters.status || row.status === parsedFilters.status,
    )
    .filter(
      (row) =>
        !parsedFilters.team_id ||
        row.team_a_id === parsedFilters.team_id ||
        row.team_b_id === parsedFilters.team_id,
    )
    .filter(
      (row) =>
        !parsedFilters.date || scheduledDateKey(row) === parsedFilters.date,
    )
    .sort(
      (a, b) =>
        (a.scheduled_at
          ? Date.parse(a.scheduled_at)
          : Number.MAX_SAFE_INTEGER) -
          (b.scheduled_at
            ? Date.parse(b.scheduled_at)
            : Number.MAX_SAFE_INTEGER) ||
        (a.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) -
          (b.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) ||
        (a.match_number ?? Number.MAX_SAFE_INTEGER) -
          (b.match_number ?? Number.MAX_SAFE_INTEGER),
    );
}

export async function getTournamentMatch(
  submissionId: string,
  matchId: string,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  return currentMatch(
    submissionId,
    z.uuid().parse(matchId),
    context,
    dependencies,
  );
}

export async function createTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(
    createTournamentMatchMutationSchema,
    parsedEnvelope.values,
  );
  const payload = omitRuntimeFields(values, new Set(["timezone"]));
  try {
    return resultSchema.parse(
      await dependencies.create({
        p_submission_id: parsedEnvelope.submissionId,
        p_payload: asJson(payload),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "create_tournament_match",
      submissionId: parsedEnvelope.submissionId,
    });
  }
}

export async function updateTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(
    updateTournamentMatchMutationSchema,
    parsedEnvelope.values,
  );
  const current = await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  parse(createTournamentMatchSchema, {
    ...current,
    ...values,
    submission_id: parsedEnvelope.submissionId,
  });
  const { id, expected_updated_at } = values;
  const payload = omitRuntimeFields(
    values,
    new Set(["id", "expected_updated_at", "timezone"]),
  );
  try {
    return resultSchema.parse(
      await dependencies.update({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: id,
        p_expected_updated_at: expected_updated_at,
        p_payload: asJson(payload),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "update_tournament_match",
      submissionId: parsedEnvelope.submissionId,
      matchId: id,
    });
  }
}

async function changeStatus(
  input: unknown,
  context: OperationalAccessContext,
  schema: z.ZodType<{
    id: string;
    expected_updated_at: string;
    target_status: TournamentMatchStatus;
  }>,
  explicitReopen: boolean,
  dependencies: Dependencies,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(schema, parsedEnvelope.values);
  const current = await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  const currentStatus = tournamentMatchStatusSchema.parse(current.status);
  if (!canTransitionMatch(currentStatus, values.target_status, explicitReopen))
    throw new MatchApplicationError("MATCH_TRANSITION_INVALID");
  return { parsedEnvelope, values, current };
}

export async function updateTournamentMatchStatus(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const { parsedEnvelope, values } = await changeStatus(
    input,
    context,
    updateMatchStatusSchema,
    false,
    dependencies,
  );
  try {
    return resultSchema.parse(
      await dependencies.status({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        p_payload: asJson({ target_status: values.target_status }),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "update_tournament_match_status",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function startTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  return updateTournamentMatchStatus(
    {
      submissionId: parsedEnvelope.submissionId,
      values: { ...(parsedEnvelope.values as object), target_status: "live" },
    },
    context,
    dependencies,
  );
}
export async function postponeTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  return updateTournamentMatchStatus(
    {
      submissionId: parsedEnvelope.submissionId,
      values: {
        ...(parsedEnvelope.values as object),
        target_status: "postponed",
      },
    },
    context,
    dependencies,
  );
}

export async function completeTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(completeMatchSchema, parsedEnvelope.values);
  const current = await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  const currentStatus = tournamentMatchStatusSchema.parse(current.status);
  if (!canTransitionMatch(currentStatus, "completed"))
    throw new MatchApplicationError("MATCH_TRANSITION_INVALID");
  try {
    return resultSchema.parse(
      await dependencies.complete({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        p_payload: asJson({
          score_a: values.score_a,
          score_b: values.score_b,
          deadlock_match_id: values.deadlock_match_id,
          duration_seconds: values.duration_seconds,
          vod_url: values.vod_url,
        }),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "complete_tournament_match",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function createWalkoverResult(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(createWalkoverSchema, parsedEnvelope.values);
  const current = await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  const currentStatus = tournamentMatchStatusSchema.parse(current.status);
  if (!canTransitionMatch(currentStatus, "walkover"))
    throw new MatchApplicationError("MATCH_TRANSITION_INVALID");
  try {
    return resultSchema.parse(
      await dependencies.status({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        p_payload: asJson({
          target_status: "walkover",
          winner_team_id: values.winner_team_id,
        }),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "create_walkover_result",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function cancelTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(cancelMatchSchema, parsedEnvelope.values);
  const current = await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  const currentStatus = tournamentMatchStatusSchema.parse(current.status);
  if (!canTransitionMatch(currentStatus, "cancelled"))
    throw new MatchApplicationError("MATCH_TRANSITION_INVALID");
  try {
    return resultSchema.parse(
      await dependencies.cancel({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "cancel_tournament_match",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function reopenTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const { parsedEnvelope, values } = await changeStatus(
    input,
    context,
    reopenMatchSchema,
    true,
    dependencies,
  );
  try {
    return resultSchema.parse(
      await dependencies.reopen({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        p_payload: asJson({ target_status: values.target_status }),
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "reopen_tournament_match",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function deleteTournamentMatch(
  input: unknown,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const parsedEnvelope = envelope(input);
  const values = parse(deleteMatchSchema, parsedEnvelope.values);
  await currentMatch(
    parsedEnvelope.submissionId,
    values.id,
    context,
    dependencies,
  );
  try {
    return resultSchema.parse(
      await dependencies.remove({
        p_submission_id: parsedEnvelope.submissionId,
        p_match_id: values.id,
        p_expected_updated_at: values.expected_updated_at,
        ...access(context, parsedEnvelope.submissionId),
      }),
    );
  } catch (error) {
    mapError(error, {
      operation: "delete_tournament_match",
      submissionId: parsedEnvelope.submissionId,
      matchId: values.id,
    });
  }
}

export async function getMatchScheduleSummary(
  submissionId: string,
  context: OperationalAccessContext,
  dependencies: Dependencies = defaults,
) {
  const matches = await listTournamentMatches(
    submissionId,
    context,
    {},
    dependencies,
  );
  return {
    total: matches.length,
    live: matches.filter((match) => match.status === "live").length,
    upcoming: matches.filter((match) => match.status === "scheduled").length,
    completed: matches.filter((match) => match.status === "completed").length,
  };
}
