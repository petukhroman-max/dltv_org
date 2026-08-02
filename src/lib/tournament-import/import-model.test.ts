import { describe, expect, it } from "vitest";

import {
  importedMatchSchema,
  tournamentImportBundleSchema,
} from "./import-model";

const base = {
  entityType: "match" as const,
  source: { sheet: "Matches", row: 2, key: "match:1" },
  warnings: [],
  errors: [],
  proposedAction: "create" as const,
  existingEntityId: null,
  resolution: null,
  data: {
    stageKey: "stage:one",
    group: null,
    round: "Round 1",
    matchNumber: 1,
    teamAKey: "team:a",
    teamBKey: "team:b",
    scheduledAt: null,
    timezone: "UTC",
    bestOf: 3,
    scoreA: null,
    scoreB: null,
    status: "draft" as const,
    winnerTeamKey: null,
    deadlockMatchId: null,
    streamUrl: null,
    vodUrl: null,
  },
};

describe("normalized import model", () => {
  it("accepts HTTP(S) URLs and rejects malformed or active protocols as Zod errors", () => {
    expect(
      importedMatchSchema.safeParse({
        ...base,
        data: { ...base.data, streamUrl: "https://example.com/live" },
      }).success,
    ).toBe(true);
    for (const streamUrl of [
      "abc",
      "javascript:alert(1)",
      "data:text/plain,x",
      "ftp://example.com/file",
    ]) {
      expect(() =>
        importedMatchSchema.safeParse({
          ...base,
          data: { ...base.data, streamUrl },
        }),
      ).not.toThrow();
      expect(
        importedMatchSchema.safeParse({
          ...base,
          data: { ...base.data, streamUrl },
        }).success,
      ).toBe(false);
    }
  });

  it("enforces odd BO and normalized bundle bounds", () => {
    expect(
      importedMatchSchema.safeParse({
        ...base,
        data: { ...base.data, bestOf: 2 },
      }).success,
    ).toBe(false);
    expect(
      tournamentImportBundleSchema.safeParse({
        templateType: "guildlock_v1",
        detectedSheets: ["Matches"],
        fallbackTimezone: "UTC",
        entities: [base],
        warnings: [],
      }).success,
    ).toBe(true);
  });
});
