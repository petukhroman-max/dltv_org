import { z } from "zod";

import {
  nullableOffsetDateTimeSchema,
  operationalUuidSchema,
} from "@/lib/domain/operational-shared";
import type { SafeAdminPlayer } from "@/lib/domain/player";
import type { TableRow } from "@/lib/supabase/database.types";

export const tournamentRosterRoles = [
  "player",
  "substitute",
  "coach",
  "manager",
] as const;
export const tournamentRosterRoleSchema = z.enum(tournamentRosterRoles);

const rosterInputFields = z.object({
  tournament_team_id: operationalUuidSchema,
  player_id: operationalUuidSchema,
  role: tournamentRosterRoleSchema.default("player"),
  is_captain: z.boolean().default(false),
  is_active: z.boolean().default(true),
  joined_at: nullableOffsetDateTimeSchema,
  left_at: nullableOffsetDateTimeSchema,
});

function validateRosterDates(
  value: { joined_at?: string | null; left_at?: string | null },
  context: z.RefinementCtx,
) {
  if (
    value.left_at &&
    (!value.joined_at ||
      Date.parse(value.left_at) < Date.parse(value.joined_at))
  ) {
    context.addIssue({
      code: "custom",
      path: ["left_at"],
      message: "Left time must be on or after joined time.",
    });
  }
}

export const createTournamentRosterMemberSchema =
  rosterInputFields.superRefine(validateRosterDates);
export const updateTournamentRosterMemberSchema = rosterInputFields
  .omit({ tournament_team_id: true, player_id: true })
  .partial()
  .superRefine(validateRosterDates);

export type TournamentRosterMemberRow = TableRow<"tournament_roster_members">;
export type CreateTournamentRosterMemberInput = z.infer<
  typeof createTournamentRosterMemberSchema
>;
export type UpdateTournamentRosterMemberInput = z.infer<
  typeof updateTournamentRosterMemberSchema
>;
export type AdminTournamentRosterMember = TournamentRosterMemberRow & {
  team: Pick<TableRow<"tournament_teams">, "id" | "name" | "seed">;
  player: SafeAdminPlayer;
};
