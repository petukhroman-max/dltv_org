import { z } from "zod";

export const importEntityTypes = [
  "stage",
  "team",
  "player",
  "roster_member",
  "match",
  "bracket_link",
  "standings_group_assignment",
] as const;
export const importEntityTypeSchema = z.enum(importEntityTypes);
export type ImportEntityType = z.infer<typeof importEntityTypeSchema>;

export const proposedActions = [
  "create",
  "update",
  "skip",
  "conflict",
  "invalid",
] as const;
export const proposedActionSchema = z.enum(proposedActions);
export type ProposedAction = z.infer<typeof proposedActionSchema>;

export const importResolutionSchema = z
  .object({
    decision: z.enum([
      "use_spreadsheet",
      "keep_existing",
      "skip",
      "link_existing",
      "create_new",
    ]),
    existingEntityId: z.uuid().nullable().default(null),
    confirmedCompletedResultOverwrite: z.boolean().default(false),
  })
  .strict();
export type ImportResolution = z.infer<typeof importResolutionSchema>;

const sourceSchema = z
  .object({
    sheet: z.string().trim().min(1).max(100),
    row: z.number().int().positive().max(100_000),
    key: z.string().trim().min(1).max(200),
  })
  .strict();

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(max).nullable().default(null),
  );

const optionalHttpUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .url()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Only HTTP(S) URLs are allowed")
    .nullable()
    .default(null),
);

const importedBaseSchema = z.object({
  source: sourceSchema,
  warnings: z.array(z.string().max(240)).max(50).default([]),
  errors: z.array(z.string().max(240)).max(50).default([]),
  proposedAction: proposedActionSchema.default("create"),
  existingEntityId: z.uuid().nullable().default(null),
  resolution: importResolutionSchema.nullable().default(null),
});

export const importedStageSchema = importedBaseSchema
  .extend({
    entityType: z.literal("stage"),
    data: z
      .object({
        name: z.string().trim().min(1).max(160),
        stageType: z.enum([
          "qualifier",
          "group_stage",
          "swiss",
          "single_elimination",
          "double_elimination",
          "round_robin",
          "playoff",
          "final",
          "custom",
        ]),
        sequenceNumber: z.number().int().positive(),
        timezone: optionalText(64),
        bestOfDefault: z
          .number()
          .int()
          .positive()
          .refine((value) => value % 2 === 1)
          .nullable()
          .default(null),
      })
      .strict(),
  })
  .strict();

export const importedTeamSchema = importedBaseSchema
  .extend({
    entityType: z.literal("team"),
    data: z
      .object({
        name: z.string().trim().min(1).max(160),
        shortName: optionalText(40),
        region: optionalText(80),
        seed: z.number().int().positive().nullable().default(null),
        externalTeamId: optionalText(120),
      })
      .strict(),
  })
  .strict();

export const importedPlayerSchema = importedBaseSchema
  .extend({
    entityType: z.literal("player"),
    data: z
      .object({
        displayName: z.string().trim().min(1).max(80),
        countryCode: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^[A-Z]{2}$/)
          .nullable()
          .default(null),
        platformId: optionalText(120),
        externalPlayerId: optionalText(120),
      })
      .strict(),
  })
  .strict();

export const importedRosterMemberSchema = importedBaseSchema
  .extend({
    entityType: z.literal("roster_member"),
    data: z
      .object({
        teamKey: z.string().trim().min(1).max(200),
        playerKey: z.string().trim().min(1).max(200),
        role: z.enum(["player", "substitute", "coach", "manager"]),
        isCaptain: z.boolean().default(false),
      })
      .strict(),
  })
  .strict();

export const importedMatchSchema = importedBaseSchema
  .extend({
    entityType: z.literal("match"),
    data: z
      .object({
        stageKey: z.string().trim().min(1).max(200),
        group: optionalText(80),
        round: optionalText(120),
        matchNumber: z.number().int().positive().nullable().default(null),
        teamAKey: z.string().trim().min(1).max(200).nullable().default(null),
        teamBKey: z.string().trim().min(1).max(200).nullable().default(null),
        scheduledAt: z
          .string()
          .datetime({ offset: true })
          .nullable()
          .default(null),
        timezone: optionalText(64),
        bestOf: z
          .number()
          .int()
          .positive()
          .refine((value) => value % 2 === 1)
          .nullable()
          .default(null),
        scoreA: z.number().int().nonnegative().nullable().default(null),
        scoreB: z.number().int().nonnegative().nullable().default(null),
        status: z.enum([
          "draft",
          "scheduled",
          "live",
          "completed",
          "postponed",
          "cancelled",
          "walkover",
        ]),
        winnerTeamKey: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .nullable()
          .default(null),
        deadlockMatchId: optionalText(120),
        streamUrl: optionalHttpUrl,
        vodUrl: optionalHttpUrl,
      })
      .strict(),
  })
  .strict();

export const importedBracketLinkSchema = importedBaseSchema
  .extend({
    entityType: z.literal("bracket_link"),
    data: z
      .object({
        sourceMatchKey: z.string().trim().min(1).max(200),
        outcome: z.enum(["winner", "loser"]),
        targetMatchKey: z.string().trim().min(1).max(200),
        targetSlot: z.enum(["team_a", "team_b"]),
      })
      .strict(),
  })
  .strict();

export const importedGroupAssignmentSchema = importedBaseSchema
  .extend({
    entityType: z.literal("standings_group_assignment"),
    data: z
      .object({
        stageKey: z.string().trim().min(1).max(200),
        teamKey: z.string().trim().min(1).max(200),
        groupName: z.string().trim().min(1).max(80),
        sequenceNumber: z.number().int().positive().nullable().default(null),
      })
      .strict(),
  })
  .strict();

export const importedEntitySchema = z.discriminatedUnion("entityType", [
  importedStageSchema,
  importedTeamSchema,
  importedPlayerSchema,
  importedRosterMemberSchema,
  importedMatchSchema,
  importedBracketLinkSchema,
  importedGroupAssignmentSchema,
]);
export type ImportedEntity = z.infer<typeof importedEntitySchema>;

export const tournamentImportBundleSchema = z
  .object({
    templateType: z.enum(["guildlock_v1", "custom_mapping", "unknown"]),
    detectedSheets: z.array(z.string().trim().min(1).max(100)).max(32),
    fallbackTimezone: z.string().trim().min(1).max(64).nullable().default(null),
    entities: z.array(importedEntitySchema).max(10_000),
    warnings: z.array(z.string().max(240)).max(200).default([]),
  })
  .strict();
export type TournamentImportBundle = z.infer<
  typeof tournamentImportBundleSchema
>;

export function normalizeImportName(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export function importSlug(value: string): string {
  const slug = normalizeImportName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "imported";
}

export function redactImportEntity(entity: ImportedEntity): ImportedEntity {
  if (entity.entityType !== "player") return entity;
  return {
    ...entity,
    data: {
      ...entity.data,
      platformId: entity.data.platformId ? "[redacted]" : null,
    },
  };
}
