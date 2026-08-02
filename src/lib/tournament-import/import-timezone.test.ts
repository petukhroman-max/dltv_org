import { describe, expect, it } from "vitest";

import type { TournamentImportBundle } from "./import-model";
import {
  defaultImportTimezone,
  importNeedsTimezoneConfirmation,
  importTimezoneSchema,
  prepareImportTimezoneConfirmation,
  timezoneFallbackWarning,
} from "./import-timezone";

const bundle: TournamentImportBundle = {
  templateType: "guildlock_v1",
  detectedSheets: ["Matches"],
  fallbackTimezone: null,
  warnings: [],
  entities: [
    {
      entityType: "stage",
      source: { sheet: "Matches", row: 1, key: "stage:groups" },
      data: {
        name: "Groups",
        stageType: "group_stage",
        sequenceNumber: 1,
        timezone: null,
        bestOfDefault: null,
      },
      warnings: [],
      errors: [],
      proposedAction: "create",
      existingEntityId: null,
      resolution: null,
    },
    {
      entityType: "match",
      source: { sheet: "Matches", row: 2, key: "match:1" },
      data: {
        stageKey: "stage:groups",
        group: null,
        round: null,
        matchNumber: 1,
        teamAKey: null,
        teamBKey: null,
        scheduledAt: null,
        timezone: "Europe/London",
        bestOf: null,
        scoreA: null,
        scoreB: null,
        status: "draft",
        winnerTeamKey: null,
        deadlockMatchId: null,
        streamUrl: null,
        vodUrl: null,
      },
      warnings: [],
      errors: [],
      proposedAction: "create",
      existingEntityId: null,
      resolution: null,
    },
  ],
};

describe("import timezone confirmation", () => {
  it("uses the tournament timezone by default and falls back to UTC", () => {
    expect(defaultImportTimezone("Asia/Bangkok")).toBe("Asia/Bangkok");
    expect(defaultImportTimezone(null)).toBe("UTC");
    expect(defaultImportTimezone("not/a-zone")).toBe("UTC");
  });

  it("requires confirmation only for stage/match rows with null timezone", () => {
    const prepared = prepareImportTimezoneConfirmation(bundle, "Asia/Bangkok");
    expect(prepared.fallbackTimezone).toBe("Asia/Bangkok");
    expect(importNeedsTimezoneConfirmation(prepared)).toBe(true);
    expect(prepared.entities[0]?.warnings).toContain(timezoneFallbackWarning);
    expect(
      prepared.entities[1]?.entityType === "match"
        ? prepared.entities[1].data.timezone
        : null,
    ).toBe("Europe/London");
    expect(prepared.entities[1]?.warnings).not.toContain(
      timezoneFallbackWarning,
    );
  });

  it("accepts supported IANA zones and rejects arbitrary values", () => {
    expect(importTimezoneSchema.safeParse("UTC").success).toBe(true);
    expect(importTimezoneSchema.safeParse("America/New_York").success).toBe(
      true,
    );
    expect(importTimezoneSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
  });
});
