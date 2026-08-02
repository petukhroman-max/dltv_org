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
    expect(match?.proposedAction).toBe("conflict");
    expect(match?.errors).toContain("winner_not_participant");
    expect(match?.data.winnerTeamKey).toBeNull();
  });

  it("canonicalizes game-level rows into one unresolved series with all source references", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("series"),
      "series.xlsx",
      mime,
      "UTC",
    );
    const matches = result.bundle.entities.filter(
      (entity) => entity.entityType === "match",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].data.matchNumber).toBe(16);
    expect(matches[0].data.status).toBe("draft");
    expect(matches[0].data.winnerTeamKey).toBeNull();
    expect(matches[0].data.deadlockMatchId).toBeNull();
    expect(matches[0].source.references).toHaveLength(3);
    expect(matches[0].warnings).toEqual(
      expect.arrayContaining([
        "series_score_not_available",
        "multiple_game_rows_for_series",
      ]),
    );
    expect(matches[0].proposedAction).toBe("conflict");
  });

  it("accepts a conservative leading-The team alias without inventing a series winner", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("alias"),
      "alias.xlsx",
      mime,
      "UTC",
    );
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.errors).not.toContain("winner_not_participant");
    expect(match?.data.status).toBe("draft");
    expect(match?.data.winnerTeamKey).toBeNull();
  });

  it("keeps an explicit FF row as a participant walkover", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("walkover"),
      "walkover.xlsx",
      mime,
      "UTC",
    );
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.data.status).toBe("walkover");
    expect(match?.data.winnerTeamKey).toBe("team:aurora");
    expect(match?.warnings).not.toContain("series_score_not_available");
  });

  it("deduplicates repeated Deadlock IDs and retains every source row", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("duplicate"),
      "duplicate.xlsx",
      mime,
      "UTC",
    );
    const matches = result.bundle.entities.filter(
      (entity) => entity.entityType === "match",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].source.key).toBe("match:deadlock:90000001");
    expect(matches[0].source.references).toHaveLength(2);
    expect(matches[0].proposedAction).toBe("create");
  });

  it("makes conflicting rows for one Deadlock ID a blocking conflict", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("conflicts"),
      "conflicts.xlsx",
      mime,
      "UTC",
    );
    const matches = result.bundle.entities.filter(
      (entity) => entity.entityType === "match",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].proposedAction).toBe("conflict");
    expect(matches[0].errors).toContain("duplicate_match_data_conflict");
    expect(matches[0].source.references).toHaveLength(2);
  });

  it("deduplicates a Deadlock ID across sheets and flags conflicting stage context", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("cross_sheet"),
      "cross-sheet.xlsx",
      mime,
      "UTC",
    );
    const matches = result.bundle.entities.filter(
      (entity) => entity.entityType === "match",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].source.references).toEqual(
      expect.arrayContaining([
        { sheet: "QD1 Match info", row: 5 },
        { sheet: "QD2 Match Info", row: 5 },
      ]),
    );
    expect(matches[0].proposedAction).toBe("conflict");
    expect(matches[0].errors).toContain("duplicate_match_data_conflict");
  });

  it("normalizes either participant winner but does not apply a game winner without a series score", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture("winner_b"),
      "winner-b.xlsx",
      mime,
      "UTC",
    );
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.errors).not.toContain("winner_not_participant");
    expect(match?.data.status).toBe("draft");
    expect(match?.data.scoreA).toBeNull();
    expect(match?.data.scoreB).toBeNull();
    expect(match?.data.winnerTeamKey).toBeNull();
  });

  it("keeps non-canonical round labels out of matchNumber", async () => {
    const result = await parseTournamentWorkbook(
      await buildGuildlockWorkbookFixture(),
      "fixture.xlsx",
      mime,
      "UTC",
    );
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.data.round).toBe("Qualifiers - Group A - Round 1");
    expect(match?.data.group).toBe("A");
    expect(match?.data.matchNumber).toBeNull();
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
