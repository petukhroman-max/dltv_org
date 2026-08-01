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
import { logOperationalMutationFailure } from "@/lib/operational-workspace/operational-diagnostics";

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
function safeEntityIds(value: unknown) {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    ["tournament_team_id", "player_id", "membership_id"]
      .filter((key) => typeof record[key] === "string")
      .map((key) => [key, String(record[key])]),
  );
}

function stableErrorCode(error: unknown) {
  const detail = message(error);
  if (code(error) === "40001") return "ROSTER_STALE_UPDATE";
  if (code(error) === "42501" || detail.includes("access_denied"))
    return "ROSTER_ACCESS_DENIED";
  if (detail.includes("platform_id_conflict"))
    return "ROSTER_PLATFORM_ID_CONFLICT";
  if (detail.includes("membership_conflict"))
    return "ROSTER_MEMBERSHIP_CONFLICT";
  if (detail.includes("same_name_confirmation_required"))
    return "ROSTER_DISPLAY_NAME_CONFIRMATION_REQUIRED";
  if (detail.includes("captain_role_invalid"))
    return "ROSTER_CAPTAIN_ROLE_INVALID";
  if (["42883", "PGRST202"].includes(code(error)))
    return "ROSTER_RPC_CONTRACT_MISMATCH";
  return "ROSTER_MUTATION_FAILED";
}

function mapError(
  error: unknown,
  diagnostic: {
    operation: string;
    submissionId: string;
    entityIds?: Record<string, string>;
  },
): never {
  const stableCode = stableErrorCode(error);
  logOperationalMutationFailure({
    ...diagnostic,
    stableCode,
    databaseCode: code(error),
  });
  if (stableCode === "ROSTER_STALE_UPDATE") throw new RosterConflictError();
  if (stableCode === "ROSTER_ACCESS_DENIED")
    throw new RosterAuthorizationError();
  if (stableCode === "ROSTER_PLATFORM_ID_CONFLICT")
    throw new RosterDuplicateIdentityError("platform_id");
  if (stableCode === "ROSTER_MEMBERSHIP_CONFLICT")
    throw new RosterValidationError({
      player_id: "This player already has this role on the selected team.",
    });
  if (stableCode === "ROSTER_DISPLAY_NAME_CONFIRMATION_REQUIRED")
    throw new RosterDuplicateIdentityError("display_name");
  if (stableCode === "ROSTER_CAPTAIN_ROLE_INVALID")
    throw new RosterValidationError({
      is_captain: "Only a player can be assigned as captain.",
    });
  throw new RosterMutationError();
}
function payload(value: unknown): Json {
  return value as Json;
}

async function mutate(
  operation: string,
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
    mapError(error, {
      operation,
      submissionId: envelope.submissionId,
      entityIds: safeEntityIds(values),
    });
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
    mapError(error, {
      operation: "search_players_for_roster",
      submissionId,
    });
  }
}

export async function createPlayerAndAddToRoster(
  input: unknown,
  context: OperationalAccessContext,
) {
  const { envelope } = prepare(input, context);
  const raw = parse(createPlayerAndAddToRosterSchema, envelope.values);
  return mutate(
    "create_player_and_add_to_roster",
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
    "add_existing_player_to_roster",
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
    "update_player_profile",
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
    "update_roster_membership",
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
    "remove_roster_member",
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
    "restore_roster_member",
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
