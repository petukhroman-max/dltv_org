import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildGuildlockWorkbookFixture } from "@/test/guildlock-import-fixtures";
import { parseTournamentWorkbook } from "./guildlock-adapter";

const mime =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

describe("GuildlockWorkbookAdapter", () => {
  it("detects the anonymized Guildlock structure by sheets, merged headers and column headers", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture(),
      "fixture.xlsx",
      mime,
      "UTC",
    );
    expect(result.detection.templateType).toBe("guildlock_v1");
    expect(result.detection.confidence).toBeGreaterThanOrEqual(0.8);
    expect(
      result.bundle.entities.some((entity) => entity.entityType === "stage"),
    ).toBe(true);
    expect(
      result.bundle.entities.some((entity) => entity.entityType === "team"),
    ).toBe(true);
    expect(
      result.bundle.entities.some((entity) => entity.entityType === "player"),
    ).toBe(true);
    expect(
      result.bundle.entities.some(
        (entity) => entity.entityType === "roster_member",
      ),
    ).toBe(true);
    expect(
      result.bundle.entities.some((entity) => entity.entityType === "match"),
    ).toBe(true);
    expect(
      result.bundle.entities.some(
        (entity) => entity.entityType === "standings_group_assignment",
      ),
    ).toBe(true);
  });

  it("skips example and empty rows and reports unsafe result ambiguity", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("warnings"),
      "warnings.xlsx",
      mime,
      "Europe/London",
    );
    expect(
      result.bundle.entities.some((entity) =>
        entity.source.key.includes("Example"),
      ),
    ).toBe(false);
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.proposedAction).toBe("invalid");
    expect(match?.errors).toContain("winner_not_participant");
  });

  it("does not expose roster full names and keeps private platform IDs in the private normalized contract only", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture(),
      "fixture.xlsx",
      mime,
      "UTC",
    );
    const serialized = JSON.stringify(result.bundle);
    expect(serialized).not.toContain("Fictional Person");
    expect(serialized).toContain("private-001");
  });
});
