import { z } from "zod";

import {
  nullableHttpUrlSchema,
  nullableOffsetDateTimeSchema,
  nullableTrimmedString,
  operationalSourceSchema,
  operationalUuidSchema,
  positiveOddIntegerSchema,
  timezoneSchema,
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
export type TournamentMatchStatus = (typeof tournamentMatchStatuses)[number];
export const tournamentMatchStatusSchema = z.enum(tournamentMatchStatuses);

const nullableUuid = operationalUuidSchema.nullable().optional();
const nullableScore = z.number().int().nonnegative().nullable().optional();
const expectedVersion = {
  id: operationalUuidSchema,
  expected_updated_at: z.string().datetime({ offset: true }),
};

const matchEditableFields = z.object({
  stage_id: nullableUuid,
  match_number: z.number().int().positive().nullable().optional(),
  round_name: nullableTrimmedString(200),
  group_name: nullableTrimmedString(200),
  scheduled_at: nullableOffsetDateTimeSchema,
  timezone: timezoneSchema,
  best_of: positiveOddIntegerSchema.nullable().optional(),
  team_a_id: nullableUuid,
  team_b_id: nullableUuid,
  stream_url: nullableHttpUrlSchema,
  vod_url: nullableHttpUrlSchema,
  deadlock_match_id: nullableTrimmedString(200),
  duration_seconds: z.number().int().positive().nullable().optional(),
  is_public: z.boolean().default(true),
});

const persistedMatchFields = matchEditableFields.extend({
  submission_id: operationalUuidSchema,
  score_a: nullableScore,
  score_b: nullableScore,
  winner_team_id: nullableUuid,
  status: tournamentMatchStatusSchema,
  source: operationalSourceSchema.default("manual"),
});

type MatchValidationValue = Partial<z.infer<typeof persistedMatchFields>>;

function validateParticipants(
  value: MatchValidationValue,
  context: z.RefinementCtx,
) {
  if (
    value.team_a_id &&
    value.team_b_id &&
    value.team_a_id === value.team_b_id
  ) {
    context.addIssue({
      code: "custom",
      path: ["team_b_id"],
      message: "Teams must differ.",
    });
  }
  if (
    value.winner_team_id &&
    value.winner_team_id !== value.team_a_id &&
    value.winner_team_id !== value.team_b_id
  ) {
    context.addIssue({
      code: "custom",
      path: ["winner_team_id"],
      message: "Winner must be a participant.",
    });
  }
}

function validateMatchState(
  value: MatchValidationValue,
  context: z.RefinementCtx,
) {
  validateParticipants(value, context);
  const hasResult =
    value.score_a != null ||
    value.score_b != null ||
    value.winner_team_id != null;
  if (
    ["draft", "scheduled", "postponed", "cancelled"].includes(
      value.status ?? "",
    ) &&
    hasResult
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "This match status cannot contain a result.",
    });
  }
  if (
    value.status === "scheduled" &&
    (!value.stage_id || !value.scheduled_at || !value.best_of)
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Scheduled matches require a stage, time, and best of value.",
    });
  }
  if (
    value.status === "live" &&
    (!value.stage_id ||
      !value.team_a_id ||
      !value.team_b_id ||
      value.winner_team_id != null)
  ) {
    context.addIssue({
      code: "custom",
      path: ["status"],
      message: "Live matches require a stage, both teams, and no winner.",
    });
  }
  if (value.status === "completed") {
    if (
      !value.team_a_id ||
      !value.team_b_id ||
      value.score_a == null ||
      value.score_b == null ||
      !value.winner_team_id
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
      const expectedWinner =
        value.score_a > value.score_b ? value.team_a_id : value.team_b_id;
      if (value.winner_team_id !== expectedWinner) {
        context.addIssue({
          code: "custom",
          path: ["winner_team_id"],
          message: "Winner must match the higher score.",
        });
      }
    }
  }
  if (value.status === "walkover" && !value.winner_team_id) {
    context.addIssue({
      code: "custom",
      path: ["winner_team_id"],
      message: "Walkovers require a winner.",
    });
  }
}

export const createTournamentMatchSchema =
  persistedMatchFields.superRefine(validateMatchState);
export const updateTournamentMatchSchema = persistedMatchFields
  .omit({ submission_id: true })
  .partial()
  .superRefine(validateParticipants);

export const createTournamentMatchMutationSchema = matchEditableFields
  .omit({ vod_url: true, deadlock_match_id: true, duration_seconds: true })
  .extend({ status: z.enum(["draft", "scheduled"]).default("draft") })
  .superRefine(validateMatchState);

export const updateTournamentMatchMutationSchema = matchEditableFields
  .extend(expectedVersion)
  .superRefine(validateParticipants);

export const updateMatchStatusSchema = z.object({
  ...expectedVersion,
  target_status: z.enum(["scheduled", "live", "postponed"]),
});

export const completeMatchSchema = z
  .object({
    ...expectedVersion,
    team_a_id: operationalUuidSchema,
    team_b_id: operationalUuidSchema,
    score_a: z.number().int().nonnegative(),
    score_b: z.number().int().nonnegative(),
    deadlock_match_id: nullableTrimmedString(200),
    duration_seconds: z.number().int().positive().nullable().optional(),
    vod_url: nullableHttpUrlSchema,
  })
  .superRefine((value, context) => {
    validateParticipants(value, context);
    if (value.score_a === value.score_b) {
      context.addIssue({
        code: "custom",
        path: ["score_b"],
        message: "Completed Deadlock matches cannot end in a draw.",
      });
    }
  });

export const createWalkoverSchema = z
  .object({
    ...expectedVersion,
    team_a_id: operationalUuidSchema,
    team_b_id: operationalUuidSchema,
    winner_team_id: operationalUuidSchema,
  })
  .superRefine(validateParticipants);

export const cancelMatchSchema = z.object(expectedVersion);
export const reopenMatchSchema = z.object({
  ...expectedVersion,
  target_status: z.enum(["draft", "scheduled", "live"]),
});
export const deleteMatchSchema = z.object(expectedVersion);

export const matchFiltersSchema = z.object({
  stage_id: operationalUuidSchema.optional(),
  status: tournamentMatchStatusSchema.optional(),
  team_id: operationalUuidSchema.optional(),
  date: z.string().date().optional(),
  view: z.enum(["list", "schedule"]).default("list"),
});

const ordinaryTransitions: Record<
  TournamentMatchStatus,
  TournamentMatchStatus[]
> = {
  draft: ["scheduled", "cancelled"],
  scheduled: ["live", "postponed", "cancelled", "completed", "walkover"],
  postponed: ["scheduled", "cancelled"],
  live: ["completed", "cancelled", "walkover"],
  completed: [],
  cancelled: [],
  walkover: [],
};

export function canTransitionMatch(
  current: TournamentMatchStatus,
  target: TournamentMatchStatus,
  explicitReopen = false,
) {
  if (ordinaryTransitions[current].includes(target)) return true;
  if (!explicitReopen) return false;
  return (
    (current === "completed" && target === "live") ||
    (current === "cancelled" && ["draft", "scheduled"].includes(target)) ||
    (current === "walkover" && target === "scheduled")
  );
}

export type TournamentMatchRow = TableRow<"tournament_matches">;
export type CreateTournamentMatchInput = z.infer<
  typeof createTournamentMatchSchema
>;
export type UpdateTournamentMatchInput = z.infer<
  typeof updateTournamentMatchSchema
>;
type MatchTeamReference = Pick<TableRow<"tournament_teams">, "id" | "name">;
export type TournamentMatchReadModel = TournamentMatchRow & {
  timezone: string;
  stage:
    | (Pick<
        TableRow<"tournament_stages">,
        "id" | "name" | "sequence_number"
      > & { timezone?: string | null })
    | null;
  team_a: MatchTeamReference | null;
  team_b: MatchTeamReference | null;
  winner_team: MatchTeamReference | null;
};
export type AdminTournamentMatch = TournamentMatchReadModel;
export type OrganizerTournamentMatch = TournamentMatchReadModel;
export type PublicTournamentMatch = never;
