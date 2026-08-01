import "server-only";

import { z } from "zod";

import {
  bracketLinkSchema,
  bracketPositionSchema,
  bracketStageTypes,
  groupTeamSchema,
  standingAdjustmentSchema,
  standingsConfigSchema,
  standingsStageTypes,
  validateStageBracket as validateBracketModel,
  type StandingRow,
} from "@/lib/domain/bracket-standings";
import {
  toOperationalRpcAccess,
  type OperationalAccessContext,
} from "@/lib/operational-workspace/access-context";
import * as repository from "@/lib/operational-workspace/bracket-standings.repository";
import type { Json } from "@/lib/supabase/database.types";
import type { StructureActionState } from "@/lib/operational-workspace/bracket-standings-state";

export type StructureOperation =
  | "position"
  | "link"
  | "unlink"
  | "config"
  | "assign_group"
  | "remove_group"
  | "adjust"
  | "delete_adjustment";
export class StructureApplicationError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function access(context: OperationalAccessContext, submissionId: string) {
  try {
    return toOperationalRpcAccess(context, submissionId);
  } catch {
    throw new StructureApplicationError("STRUCTURE_ACCESS_DENIED");
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) throw result.error;
  return result.data;
}

function json(value: unknown) {
  return value as Json;
}

export async function getBracket(
  submissionId: string,
  stageId: string,
  context: OperationalAccessContext,
) {
  z.uuid().parse(submissionId);
  z.uuid().parse(stageId);
  access(context, submissionId);
  const result = await repository.selectBracket(submissionId, stageId);
  if (!result.stage)
    throw new StructureApplicationError("BRACKET_STAGE_NOT_FOUND");
  if (!bracketStageTypes.has(result.stage.stage_type))
    throw new StructureApplicationError("BRACKET_STAGE_INCOMPATIBLE");
  return result;
}

export async function getStandings(
  submissionId: string,
  stageId: string,
  context: OperationalAccessContext,
) {
  z.uuid().parse(submissionId);
  z.uuid().parse(stageId);
  access(context, submissionId);
  const result = await repository.selectStandings(submissionId, stageId);
  if (!result.stage)
    throw new StructureApplicationError("STANDINGS_STAGE_NOT_FOUND");
  if (!standingsStageTypes.has(result.stage.stage_type))
    throw new StructureApplicationError("STANDINGS_STAGE_INCOMPATIBLE");
  return { ...result, standings: result.standings as StandingRow[] };
}

export const listStageBracket = getBracket;
export const calculateStageStandings = getStandings;

export async function validateStageBracket(
  submissionId: string,
  stageId: string,
  context: OperationalAccessContext,
) {
  const bracket = await getBracket(submissionId, stageId, context);
  return validateBracketModel(bracket.matches, bracket.links);
}

export async function getStageStandingsConfig(
  submissionId: string,
  stageId: string,
  context: OperationalAccessContext,
) {
  return (await getStandings(submissionId, stageId, context)).config;
}

export async function advanceBracketOutcome(
  submissionId: string,
  matchId: string,
  context: OperationalAccessContext,
) {
  return repository.advanceBracketOutcomeRpc({
    p_submission_id: z.uuid().parse(submissionId),
    p_match_id: z.uuid().parse(matchId),
    ...access(context, submissionId),
  });
}

export async function mutateStructure(
  operation: StructureOperation,
  submissionId: string,
  context: OperationalAccessContext,
  raw: Record<string, unknown>,
) {
  const rpcAccess = access(context, submissionId);
  if (operation === "position") {
    const value = parse(bracketPositionSchema, raw);
    return repository.assignBracketPositionRpc({
      p_submission_id: submissionId,
      p_match_id: value.match_id,
      p_expected_updated_at: value.expected_updated_at,
      p_payload: json({
        bracket_type: value.bracket_type,
        section: value.section,
        round: value.round,
        position: value.position,
      }),
      ...rpcAccess,
    });
  }
  if (operation === "link") {
    const value = parse(bracketLinkSchema, raw);
    return repository.createBracketLinkRpc({
      p_submission_id: submissionId,
      p_payload: json(value),
      ...rpcAccess,
    });
  }
  if (operation === "unlink")
    return repository.deleteBracketLinkRpc({
      p_submission_id: submissionId,
      p_link_id: z.uuid().parse(raw.id),
      p_expected_updated_at: z
        .string()
        .datetime({ offset: true })
        .parse(raw.expected_updated_at),
      ...rpcAccess,
    });
  if (operation === "config") {
    const value = parse(standingsConfigSchema, raw);
    return repository.updateStandingsConfigRpc({
      p_submission_id: submissionId,
      p_stage_id: value.stage_id,
      p_expected_updated_at: value.expected_updated_at ?? null,
      p_payload: json({
        enabled: value.enabled,
        points_for_win: value.points_for_win,
        points_for_loss: value.points_for_loss,
        points_for_walkover: value.points_for_walkover,
        score_difference_enabled: value.score_difference_enabled,
        qualification_places: value.qualification_places,
        calculation_mode: value.calculation_mode,
      }),
      ...rpcAccess,
    });
  }
  if (operation === "assign_group") {
    const value = parse(groupTeamSchema, raw);
    return repository.assignGroupTeamRpc({
      p_submission_id: submissionId,
      p_stage_id: value.stage_id,
      p_team_id: value.team_id,
      p_group_name: value.group_name,
      p_sequence_number: value.sequence_number,
      ...rpcAccess,
    });
  }
  if (operation === "remove_group")
    return repository.removeGroupTeamRpc({
      p_submission_id: submissionId,
      p_assignment_id: z.uuid().parse(raw.id),
      p_expected_updated_at: z
        .string()
        .datetime({ offset: true })
        .parse(raw.expected_updated_at),
      ...rpcAccess,
    });
  if (operation === "adjust") {
    const value = parse(standingAdjustmentSchema, raw);
    return repository.upsertAdjustmentRpc({
      p_submission_id: submissionId,
      p_stage_id: value.stage_id,
      p_team_id: value.team_id,
      p_expected_updated_at: value.expected_updated_at ?? null,
      p_payload: json({
        points_adjustment: value.points_adjustment,
        rank_override: value.rank_override,
        qualified_override: value.qualified_override,
        public_note: value.public_note,
      }),
      ...rpcAccess,
    });
  }
  return repository.deleteAdjustmentRpc({
    p_submission_id: submissionId,
    p_adjustment_id: z.uuid().parse(raw.id),
    p_expected_updated_at: z
      .string()
      .datetime({ offset: true })
      .parse(raw.expected_updated_at),
    ...rpcAccess,
  });
}

export const assignMatchBracketPosition = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("position", submissionId, context, values);
export const createBracketLink = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("link", submissionId, context, values);
export const deleteBracketLink = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("unlink", submissionId, context, values);
export const updateStageStandingsConfig = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("config", submissionId, context, values);
export const assignTeamToStageGroup = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("assign_group", submissionId, context, values);
export const removeTeamFromStageGroup = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("remove_group", submissionId, context, values);
export const upsertStandingAdjustment = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("adjust", submissionId, context, values);
export const createStandingAdjustment = upsertStandingAdjustment;
export const updateStandingAdjustment = upsertStandingAdjustment;
export const deleteStandingAdjustment = (
  submissionId: string,
  context: OperationalAccessContext,
  values: Record<string, unknown>,
) => mutateStructure("delete_adjustment", submissionId, context, values);

export async function runStructureMutation(
  operation: StructureOperation,
  submissionId: string,
  context: OperationalAccessContext,
  formData: FormData,
): Promise<StructureActionState> {
  try {
    await mutateStructure(
      operation,
      submissionId,
      context,
      Object.fromEntries(formData.entries()),
    );
    return { status: "success", message: "Saved.", fieldErrors: {} };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        status: "error",
        message: "Check the highlighted values.",
        fieldErrors: Object.fromEntries(
          error.issues.map((issue) => [
            String(issue.path[0] ?? "form"),
            issue.message,
          ]),
        ),
      };
    const message =
      typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
    const codes: Record<string, string> = {
      bracket_stage_incompatible: "BRACKET_STAGE_UNSUPPORTED",
      bracket_type_mismatch: "BRACKET_STAGE_UNSUPPORTED",
      bracket_loser_link_unsupported: "BRACKET_STAGE_UNSUPPORTED",
      bracket_link_scope_invalid: "BRACKET_MATCH_OUTSIDE_STAGE",
      bracket_link_cycle: "BRACKET_LINK_CYCLE",
      bracket_target_slot_occupied: "BRACKET_TARGET_SLOT_OCCUPIED",
      bracket_outcome_already_linked: "BRACKET_OUTCOME_ALREADY_LINKED",
      bracket_invalid_round_direction: "BRACKET_INVALID_ROUND_DIRECTION",
      bracket_advancement_conflict: "BRACKET_ADVANCEMENT_CONFLICT",
      standings_stage_incompatible: "STANDINGS_STAGE_UNSUPPORTED",
      bracket_standings_scope_invalid: "STANDINGS_TEAM_OUTSIDE_TOURNAMENT",
      standings_group_conflict: "STANDINGS_GROUP_DUPLICATE",
      standings_input_invalid: "STANDINGS_INVALID_CONFIG",
      standings_stale_update: "STANDINGS_STALE_UPDATE",
      bracket_stale_update: "BRACKET_STALE_UPDATE",
      bracket_position_conflict: "BRACKET_POSITION_CONFLICT",
      bracket_target_has_result: "BRACKET_TARGET_HAS_RESULT",
    };
    const stable = Object.entries(codes).find(([databaseCode]) =>
      message.includes(databaseCode),
    )?.[1];
    return {
      status: "error",
      message: stable ?? "STRUCTURE_MUTATION_FAILED",
      fieldErrors: {},
    };
  }
}
