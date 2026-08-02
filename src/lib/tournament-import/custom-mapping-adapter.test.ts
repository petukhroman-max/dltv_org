import { Workbook } from "exceljs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseCustomMappedWorkbook } from "./custom-mapping-adapter";

describe("custom mapping adapter", () => {
  it("maps explicit team, player and match headers into the generic model", async () => {
    const workbook = new Workbook();
    workbook.addWorksheet("Teams").addRows([
      ["Name", "Code", "Seed"],
      ["Aurora", "AUR", 1],
      ["Beacon", "BCN", 2],
    ]);
    workbook.addWorksheet("Players").addRows([
      ["IGN", "Team", "Role", "ID"],
      ["Player One", "Aurora", "Captain", "private-001"],
    ]);
    workbook.addWorksheet("Matches").addRows([
      ["Stage", "Team A", "Team B", "When", "BO", "ID"],
      ["Groups", "Aurora", "Beacon", "2026-08-01T12:00:00Z", 3, "90001"],
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const result = await parseCustomMappedWorkbook({
      buffer,
      filename: "custom.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fallbackTimezone: "UTC",
      mapping: {
        teamSheet: "Teams",
        playerSheet: "Players",
        matchSheet: "Matches",
        teams: {
          teamName: "Name",
          shortName: "Code",
          region: null,
          seed: "Seed",
          group: null,
        },
        players: {
          displayName: "IGN",
          team: "Team",
          role: "Role",
          captain: null,
          country: null,
          platformId: "ID",
        },
        matches: {
          stage: "Stage",
          group: null,
          round: null,
          matchNumber: null,
          teamA: "Team A",
          teamB: "Team B",
          scheduledDateTime: "When",
          timezone: null,
          bestOf: "BO",
          scoreA: null,
          scoreB: null,
          status: null,
          deadlockMatchId: "ID",
          stream: null,
          vod: null,
        },
      },
    });
    expect(result.bundle.templateType).toBe("custom_mapping");
    expect(result.bundle.entities.map((entity) => entity.entityType)).toEqual(
      expect.arrayContaining([
        "stage",
        "team",
        "player",
        "roster_member",
        "match",
      ]),
    );
    const match = result.bundle.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(
      match && match.entityType === "match" ? match.data.scheduledAt : null,
    ).toBe("2026-08-01T12:00:00.000Z");
    expect(
      match && match.entityType === "match" ? match.data.timezone : null,
    ).toBeNull();
  });
});
