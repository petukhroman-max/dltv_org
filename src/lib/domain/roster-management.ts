import { z } from "zod";

import { tournamentRosterRoleSchema } from "@/lib/domain/tournament-roster";

const optionalIdentifier = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(max).nullable().optional(),
  );

const countryCodeSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() !== ""
      ? value.trim().toUpperCase()
      : null,
  z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
);

export function normalizePlayerDisplayName(displayName: string) {
  return displayName
    .trim()
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("en-US");
}

export const playerSearchSchema = z.object({
  query: z.string().trim().min(2).max(100),
});

export const createPlayerSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
  country_code: countryCodeSchema.optional().default(null),
  steam_id: optionalIdentifier(100),
  deadlock_account_id: optionalIdentifier(100),
});

export const updatePlayerSchema = createPlayerSchema.extend({
  player_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
});

const membershipFields = z
  .object({
    tournament_team_id: z.string().uuid(),
    role: tournamentRosterRoleSchema,
    is_captain: z.boolean().default(false),
    joined_at: z
      .preprocess(
        (value) => (value === "" ? null : value),
        z.string().datetime({ offset: true }).nullable().optional(),
      )
      .default(null),
  })
  .superRefine((value, context) => {
    if (value.is_captain && value.role !== "player") {
      context.addIssue({
        code: "custom",
        path: ["is_captain"],
        message: "Only a player can be assigned as captain.",
      });
    }
  });

export const addExistingPlayerToRosterSchema = membershipFields.and(
  z.object({ player_id: z.string().uuid() }),
);

export const createPlayerAndAddToRosterSchema = membershipFields.and(
  z.object({
    new_player: createPlayerSchema,
    confirm_same_name: z.boolean().default(false),
  }),
);

export const updateRosterMembershipSchema = z
  .object({
    tournament_team_id: z.string().uuid(),
    membership_id: z.string().uuid(),
    expected_updated_at: z.string().datetime({ offset: true }),
    role: tournamentRosterRoleSchema,
    is_captain: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.is_captain && value.role !== "player") {
      context.addIssue({
        code: "custom",
        path: ["is_captain"],
        message: "Only a player can be assigned as captain.",
      });
    }
  });

const membershipVersionSchema = z.object({
  tournament_team_id: z.string().uuid(),
  membership_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }),
});

export const removeRosterMemberSchema = membershipVersionSchema;
export const restoreRosterMemberSchema = membershipVersionSchema.extend({
  role: tournamentRosterRoleSchema,
});

export type SafeRosterPlayer = {
  id: string;
  display_name: string;
  country_code: string | null;
  steam_id: string | null;
  deadlock_account_id: string | null;
  updated_at: string;
};

export type SafeRosterMember = {
  id: string;
  tournament_team_id: string;
  player_id: string;
  role: z.infer<typeof tournamentRosterRoleSchema>;
  is_captain: boolean;
  is_active: boolean;
  joined_at: string | null;
  left_at: string | null;
  updated_at: string;
  player: SafeRosterPlayer;
};
