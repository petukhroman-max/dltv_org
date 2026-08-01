import "server-only";

import { z } from "zod";

import {
  addExistingPlayerToRosterSchema,
  createPlayerAndAddToRosterSchema,
  normalizePlayerDisplayName,
  playerSearchSchema,
  removeRosterMemberSchema,
  restoreRosterMemberSchema,
  type SafeRosterMember,
  type SafeRosterPlayer,
  updatePlayerSchema,
  updateRosterMembershipSchema,
} from "@/lib/domain/roster-management";
import {
  toOperationalRpcAccess,
  type OperationalAccessContext,
} from "@/lib/operational-workspace/access-context";
import {
  executeAddExistingPlayerRpc,
  executeCreatePlayerAndAddRpc,
  executeListTeamRoster,
  executePlayerSearchRpc,
  executeRemoveMembershipRpc,
  executeRestoreMembershipRpc,
  executeUpdateMembershipRpc,
  executeUpdatePlayerRpc,
} from "@/lib/operational-workspace/roster.repository";
import type { Json } from "@/lib/supabase/database.types";

const envelopeSchema = z.object({
  submissionId: z.string().uuid(),
  values: z.unknown(),
});
const safePlayerSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  country_code: z.string().nullable(),
  steam_id: z.string().nullable(),
  deadlock_account_id: z.string().nullable(),
  updated_at: z.string(),
});
const safeMemberSchema = z.object({
  id: z.string().uuid(),
  tournament_team_id: z.string().uuid(),
  player_id: z.string().uuid(),
  role: z.enum(["player", "substitute", "coach", "manager"]),
  is_captain: z.boolean(),
  is_active: z.boolean(),
  joined_at: z.string().nullable(),
  left_at: z.string().nullable(),
  updated_at: z.string(),
  player: safePlayerSchema,
});

export class RosterValidationError extends Error {
  constructor(readonly fieldErrors: Record<string, string>) {
    super("Roster input is invalid");
  }
}
export class RosterConflictError extends Error {}
export class RosterAuthorizationError extends Error {}
export class RosterDuplicateIdentityError extends Error {
  constructor(readonly reason: "platform_id" | "display_name") {
    super("Duplicate player identity");
  }
}
export class RosterMutationError extends Error {}

function fields(error: z.ZodError) {
  return Object.fromEntries(
    error.issues.map((issue) => [
      String(issue.path[0] ?? "form"),
      issue.message,
    ]),
  );
}
function parse<T>(schema: z.ZodType<T>, input: unknown) {
  const result = schema.safeParse(input);
  if (!result.success) throw new RosterValidationError(fields(result.error));
  return result.data;
}
function prepare(input: unknown, context: OperationalAccessContext) {
  const envelope = parse(envelopeSchema, input);
  return {
    envelope,
    access: toOperationalRpcAccess(context, envelope.submissionId),
  };
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
function mapError(error: unknown): never {
  const detail = message(error);
  if (code(error) === "40001") throw new RosterConflictError();
  if (code(error) === "42501" || detail.includes("access_denied"))
    throw new RosterAuthorizationError();
  if (detail.includes("platform_id_conflict"))
    throw new RosterDuplicateIdentityError("platform_id");
  if (detail.includes("membership_conflict"))
    throw new RosterValidationError({
      player_id: "This player already has this role on the selected team.",
    });
  if (detail.includes("same_name_confirmation_required"))
    throw new RosterDuplicateIdentityError("display_name");
  if (detail.includes("captain_role_invalid"))
    throw new RosterValidationError({
      is_captain: "Only a player can be assigned as captain.",
    });
  if (code(error) === "23505") throw new RosterMutationError();
  throw new RosterMutationError();
}
function payload(value: unknown): Json {
  return value as Json;
}

async function mutate(
  input: unknown,
  context: OperationalAccessContext,
  schema: z.ZodType,
  execute: (
    args: Parameters<typeof executeCreatePlayerAndAddRpc>[0],
  ) => Promise<unknown>,
) {
  const { envelope, access } = prepare(input, context);
  const values = parse(schema, envelope.values);
  try {
    return await execute({
      p_submission_id: envelope.submissionId,
      p_payload: payload(values),
      ...access,
    });
  } catch (error) {
    mapError(error);
  }
}

export async function searchPlayersForRoster(
  query: unknown,
  submissionId: string,
  context: OperationalAccessContext,
): Promise<SafeRosterPlayer[]> {
  const values = parse(playerSearchSchema, { query });
  const access = toOperationalRpcAccess(context, submissionId);
  try {
    return z.array(safePlayerSchema).parse(
      await executePlayerSearchRpc({
        p_submission_id: submissionId,
        p_query: values.query,
        ...access,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) throw new RosterMutationError();
    mapError(error);
  }
}

export async function createPlayerAndAddToRoster(
  input: unknown,
  context: OperationalAccessContext,
) {
  const { envelope } = prepare(input, context);
  const raw = parse(createPlayerAndAddToRosterSchema, envelope.values);
  return mutate(
    {
      submissionId: envelope.submissionId,
      values: {
        ...raw,
        new_player: {
          ...raw.new_player,
          normalized_name: normalizePlayerDisplayName(
            raw.new_player.display_name,
          ),
        },
      },
    },
    context,
    z.unknown(),
    executeCreatePlayerAndAddRpc,
  );
}
export async function addExistingPlayerToRoster(
  input: unknown,
  context: OperationalAccessContext,
) {
  return mutate(
    input,
    context,
    addExistingPlayerToRosterSchema,
    executeAddExistingPlayerRpc,
  );
}
export async function updateTournamentPlayerProfile(
  input: unknown,
  context: OperationalAccessContext,
) {
  const { envelope } = prepare(input, context);
  const raw = parse(updatePlayerSchema, envelope.values);
  return mutate(
    {
      submissionId: envelope.submissionId,
      values: {
        ...raw,
        normalized_name: normalizePlayerDisplayName(raw.display_name),
      },
    },
    context,
    z.unknown(),
    executeUpdatePlayerRpc,
  );
}
export async function updateRosterMembership(
  input: unknown,
  context: OperationalAccessContext,
) {
  return mutate(
    input,
    context,
    updateRosterMembershipSchema,
    executeUpdateMembershipRpc,
  );
}
export async function removeRosterMember(
  input: unknown,
  context: OperationalAccessContext,
) {
  return mutate(
    input,
    context,
    removeRosterMemberSchema,
    executeRemoveMembershipRpc,
  );
}
export async function restoreRosterMember(
  input: unknown,
  context: OperationalAccessContext,
) {
  return mutate(
    input,
    context,
    restoreRosterMemberSchema,
    executeRestoreMembershipRpc,
  );
}

export async function listTeamRoster(
  submissionId: string,
  context: OperationalAccessContext,
): Promise<SafeRosterMember[]> {
  toOperationalRpcAccess(context, submissionId);
  const rows = await executeListTeamRoster(submissionId);
  return z
    .array(safeMemberSchema)
    .parse(rows.map((row) => ({ ...row, player: row.player })))
    .sort(
      (a, b) =>
        Number(b.is_active) - Number(a.is_active) ||
        a.role.localeCompare(b.role) ||
        a.player.display_name.localeCompare(b.player.display_name),
    );
}

export async function getTournamentRosterSummary(
  submissionId: string,
  context: OperationalAccessContext,
) {
  const members = await listTeamRoster(submissionId, context);
  return {
    active_members: members.filter((member) => member.is_active).length,
    inactive_members: members.filter((member) => !member.is_active).length,
    unique_players: new Set(members.map((member) => member.player_id)).size,
  };
}
