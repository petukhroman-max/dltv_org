import { z } from "zod";

import {
  nullableHttpUrlSchema,
  nullableOffsetDateTimeSchema,
  nullableTrimmedString,
  operationalSourceSchema,
  operationalUuidSchema,
  positiveOddIntegerSchema,
} from "@/lib/domain/operational-shared";
import type { TableRow } from "@/lib/supabase/database.types";

export const tournamentMatchStatuses = [
  "draft",
  "scheduled",
  "live",
  "completed",
  "postponed",
  "cancelled",
  "walkover",
] as const;
export const tournamentMatchStatusSchema = z.enum(tournamentMatchStatuses);

const nullableUuid = operationalUuidSchema.nullable().optional();
const nullableScore = z.number().int().nonnegative().nullable().optional();
const matchInputFields = z.object({
  submission_id: operationalUuidSchema,
  stage_id: nullableUuid,
  match_number: z.number().int().positive().nullable().optional(),
  round_name: nullableTrimmedString(200),
  group_name: nullableTrimmedString(200),
  scheduled_at: nullableOffsetDateTimeSchema,
  best_of: positiveOddIntegerSchema.nullable().optional(),
  team_a_id: nullableUuid,
  team_b_id: nullableUuid,
  score_a: nullableScore,
  score_b: nullableScore,
  winner_team_id: nullableUuid,
  status: tournamentMatchStatusSchema.default("scheduled"),
  deadlock_match_id: nullableTrimmedString(200),
  stream_url: nullableHttpUrlSchema,
  vod_url: nullableHttpUrlSchema,
  duration_seconds: z.number().int().positive().nullable().optional(),
  source: operationalSourceSchema.default("manual"),
  is_public: z.boolean().default(true),
});

type MatchValidationValue = Partial<z.infer<typeof matchInputFields>>;

function validateMatchResult(
  value: MatchValidationValue,
  context: z.RefinementCtx,
) {
  const { team_a_id: teamA, team_b_id: teamB, winner_team_id: winner } = value;
  if (teamA && teamB && teamA === teamB) {
    context.addIssue({
      code: "custom",
      path: ["team_b_id"],
      message: "Teams must differ.",
    });
  }
  if (winner && winner !== teamA && winner !== teamB) {
    context.addIssue({
      code: "custom",
      path: ["winner_team_id"],
      message: "Winner must be a participant.",
    });
  }
  if (
    value.status === "scheduled" &&
    (value.score_a != null || value.score_b != null || winner != null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Scheduled matches cannot have a result.",
    });
  }
  if (value.status === "live" && (!teamA || !teamB || winner != null)) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Live matches require both teams and no winner.",
    });
  }
  if (value.status === "completed") {
    if (
      !teamA ||
      !teamB ||
      value.score_a == null ||
      value.score_b == null ||
      !winner
    ) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Completed matches require teams, scores, and winner.",
      });
    } else if (value.score_a === value.score_b) {
      context.addIssue({
        code: "custom",
        path: ["score_b"],
        message: "Completed Deadlock matches cannot end in a draw.",
      });
    } else {
      const expectedWinner = value.score_a > value.score_b ? teamA : teamB;
      if (winner !== expectedWinner) {
        context.addIssue({
          code: "custom",
          path: ["winner_team_id"],
          message: "Winner must match the higher score.",
        });
      }
    }
  }
  if (value.status === "walkover" && !winner) {
    context.addIssue({
      code: "custom",
      path: ["winner_team_id"],
      message: "Walkovers require a winner.",
    });
  }
}

export const createTournamentMatchSchema =
  matchInputFields.superRefine(validateMatchResult);
export const updateTournamentMatchSchema = matchInputFields
  .omit({ submission_id: true })
  .partial()
  .superRefine(validateMatchResult);

export type TournamentMatchRow = TableRow<"tournament_matches">;
export type CreateTournamentMatchInput = z.infer<
  typeof createTournamentMatchSchema
>;
export type UpdateTournamentMatchInput = z.infer<
  typeof updateTournamentMatchSchema
>;
type MatchTeamReference = Pick<TableRow<"tournament_teams">, "id" | "name">;
export type AdminTournamentMatch = TournamentMatchRow & {
  stage: Pick<
    TableRow<"tournament_stages">,
    "id" | "name" | "sequence_number"
  > | null;
  team_a: MatchTeamReference | null;
  team_b: MatchTeamReference | null;
  winner_team: MatchTeamReference | null;
};
