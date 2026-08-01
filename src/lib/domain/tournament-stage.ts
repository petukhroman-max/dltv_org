import { z } from "zod";

import {
  nullableOffsetDateTimeSchema,
  nullableTrimmedString,
  operationalUuidSchema,
  positiveOddIntegerSchema,
  scopedSlugSchema,
  timezoneSchema,
} from "@/lib/domain/operational-shared";
import type { TableRow } from "@/lib/supabase/database.types";

export const tournamentStageTypes = [
  "qualifier",
  "group_stage",
  "swiss",
  "single_elimination",
  "double_elimination",
  "round_robin",
  "playoff",
  "final",
  "custom",
] as const;
export const tournamentStageStatuses = [
  "scheduled",
  "live",
  "completed",
  "cancelled",
] as const;

export const tournamentStageTypeSchema = z.enum(tournamentStageTypes);
export const tournamentStageStatusSchema = z.enum(tournamentStageStatuses);

const stageInputFields = z.object({
  submission_id: operationalUuidSchema,
  name: z.string().trim().min(1).max(200),
  slug: scopedSlugSchema,
  stage_type: tournamentStageTypeSchema,
  sequence_number: z.number().int().positive(),
  start_at: nullableOffsetDateTimeSchema,
  end_at: nullableOffsetDateTimeSchema,
  timezone: timezoneSchema.nullable().optional(),
  format_text: nullableTrimmedString(200),
  best_of_default: positiveOddIntegerSchema.nullable().optional(),
  team_count: z.number().int().positive().nullable().optional(),
  is_online: z.boolean().nullable().optional(),
  location_name: nullableTrimmedString(300),
  status: tournamentStageStatusSchema.default("scheduled"),
  is_public: z.boolean().default(true),
});

function validateStageDates(
  value: { start_at?: string | null; end_at?: string | null },
  context: z.RefinementCtx,
) {
  if (
    value.end_at &&
    (!value.start_at || Date.parse(value.end_at) < Date.parse(value.start_at))
  ) {
    context.addIssue({
      code: "custom",
      path: ["end_at"],
      message: "End time must be on or after start time.",
    });
  }
}

export const createTournamentStageSchema =
  stageInputFields.superRefine(validateStageDates);
export const updateTournamentStageSchema = stageInputFields
  .omit({ submission_id: true })
  .partial()
  .superRefine(validateStageDates);

export type TournamentStageRow = TableRow<"tournament_stages">;
export type CreateTournamentStageInput = z.infer<
  typeof createTournamentStageSchema
>;
export type UpdateTournamentStageInput = z.infer<
  typeof updateTournamentStageSchema
>;
export type AdminTournamentStage = TournamentStageRow;
