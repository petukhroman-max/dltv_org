import { describe, expect, it } from "vitest";

import type { TournamentImportBundle } from "./import-model";
import { validateAndMatchImportBundle } from "./import-validation";

const entityBase = {
  warnings: [],
  errors: [],
  proposedAction: "create" as const,
  existingEntityId: null,
  resolution: null,
};
const bundle: TournamentImportBundle = {
  templateType: "guildlock_v1",
  detectedSheets: ["Fixture"],
  fallbackTimezone: "UTC",
  warnings: [],
  entities: [
    {
      ...entityBase,
      entityType: "stage",
      source: { sheet: "Fixture", row: 1, key: "stage:a" },
      data: {
        name: "Groups",
        stageType: "group_stage",
        sequenceNumber: 1,
        timezone: "UTC",
        bestOfDefault: 3,
      },
    },
    {
      ...entityBase,
      entityType: "team",
      source: { sheet: "Fixture", row: 2, key: "team:a" },
      data: {
        name: "Aurora",
        shortName: "AUR",
        region: null,
        seed: 1,
        externalTeamId: null,
      },
    },
    {
      ...entityBase,
      entityType: "team",
      source: { sheet: "Fixture", row: 3, key: "team:b" },
      data: {
        name: "Beacon",
        shortName: "BCN",
        region: null,
        seed: 2,
        externalTeamId: null,
      },
    },
    {
      ...entityBase,
      entityType: "match",
      source: { sheet: "Fixture", row: 4, key: "match:a" },
      data: {
        stageKey: "stage:a",
        group: "A",
        round: "Round 1",
        matchNumber: 1,
        teamAKey: "team:a",
        teamBKey: "team:b",
        scheduledAt: null,
        timezone: "UTC",
        bestOf: 3,
        scoreA: null,
        scoreB: null,
        status: "draft",
        winnerTeamKey: null,
        deadlockMatchId: "900",
        streamUrl: null,
        vodUrl: null,
      },
    },
  ],
};
const empty = {
  stages: [],
  teams: [],
  players: [],
  matches: [],
  rosters: [],
  groupAssignments: [],
  bracketLinks: [],
};

describe("import validation and matching", () => {
  it("matches existing entities deterministically and makes completed results conflicts", () => {
    const result = validateAndMatchImportBundle(bundle, {
      stages: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Groups",
          sequence_number: 1,
          stage_type: "group_stage",
        },
      ],
      teams: [],
      players: [],
      matches: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          stage_id: "00000000-0000-4000-8000-000000000001",
          match_number: 1,
          deadlock_match_id: "900",
          status: "completed",
          team_a_id: null,
          team_b_id: null,
          scheduled_at: null,
        },
      ],
      rosters: [],
      groupAssignments: [],
      bracketLinks: [],
    });
    expect(
      result.entities.find((entity) => entity.entityType === "stage")
        ?.proposedAction,
    ).toBe("update");
    const match = result.entities.find(
      (entity) => entity.entityType === "match",
    );
    expect(match?.proposedAction).toBe("conflict");
    expect(match?.errors).toContain(
      "completed_match_requires_explicit_resolution",
    );
  });

  it("rejects same teams, unknown references and bracket cycles", () => {
    const bad: TournamentImportBundle = {
      ...bundle,
      entities: bundle.entities.map((entity) =>
        entity.entityType === "match"
          ? { ...entity, data: { ...entity.data, teamBKey: "team:a" } }
          : entity,
      ),
    };
    expect(
      validateAndMatchImportBundle(bad, empty).entities.find(
        (entity) => entity.entityType === "match",
      )?.proposedAction,
    ).toBe("invalid");
    const cyclic: TournamentImportBundle = {
      ...bundle,
      entities: [
        ...bundle.entities,
        {
          ...entityBase,
          entityType: "bracket_link",
          source: { sheet: "Fixture", row: 5, key: "link:1" },
          data: {
            sourceMatchKey: "match:a",
            outcome: "winner",
            targetMatchKey: "match:b",
            targetSlot: "team_a",
          },
        },
        {
          ...entityBase,
          entityType: "match",
          source: { sheet: "Fixture", row: 6, key: "match:b" },
          data: {
            ...(
              bundle.entities[3] as Extract<
                TournamentImportBundle["entities"][number],
                { entityType: "match" }
              >
            ).data,
            matchNumber: 2,
            deadlockMatchId: "901",
          },
        },
        {
          ...entityBase,
          entityType: "bracket_link",
          source: { sheet: "Fixture", row: 7, key: "link:2" },
          data: {
            sourceMatchKey: "match:b",
            outcome: "winner",
            targetMatchKey: "match:a",
            targetSlot: "team_b",
          },
        },
      ],
    };
    expect(
      validateAndMatchImportBundle(cyclic, empty)
        .entities.filter((entity) => entity.entityType === "bracket_link")
        .every((entity) => entity.proposedAction === "invalid"),
    ).toBe(true);
  });

  it("blocks inconsistent completed, walkover and draft results", () => {
    const baseMatch = bundle.entities[3] as Extract<
      TournamentImportBundle["entities"][number],
      { entityType: "match" }
    >;
    const cases = [
      {
        data: {
          ...baseMatch.data,
          status: "completed" as const,
          scoreA: 1,
          scoreB: 2,
          winnerTeamKey: "team:a",
        },
        issue: "completed_result_inconsistent",
        action: "invalid",
      },
      {
        data: {
          ...baseMatch.data,
          status: "walkover" as const,
          winnerTeamKey: null,
        },
        issue: "walkover_winner_required",
        action: "invalid",
      },
      {
        data: {
          ...baseMatch.data,
          status: "draft" as const,
          winnerTeamKey: "team:a",
        },
        issue: "result_status_inconsistent",
        action: "conflict",
      },
    ];
    for (const testCase of cases) {
      const result = validateAndMatchImportBundle(
        {
          ...bundle,
          entities: bundle.entities.map((entity) =>
            entity.entityType === "match"
              ? { ...entity, data: testCase.data }
              : entity,
          ),
        },
        empty,
      );
      const match = result.entities.find(
        (entity) => entity.entityType === "match",
      );
      expect(match?.proposedAction).toBe(testCase.action);
      expect(match?.errors).toContain(testCase.issue);
    }
  });

  it("treats duplicate match numbers as a resolvable conflict", () => {
    const duplicate: TournamentImportBundle = {
      ...bundle,
      entities: [
        ...bundle.entities,
        {
          ...(bundle.entities[3] as Extract<
            TournamentImportBundle["entities"][number],
            { entityType: "match" }
          >),
          source: { sheet: "Fixture", row: 5, key: "match:b" },
          data: {
            ...(
              bundle.entities[3] as Extract<
                TournamentImportBundle["entities"][number],
                { entityType: "match" }
              >
            ).data,
            deadlockMatchId: "901",
          },
        },
      ],
    };
    const matches = validateAndMatchImportBundle(
      duplicate,
      empty,
    ).entities.filter((entity) => entity.entityType === "match");
    expect(matches).toHaveLength(2);
    expect(matches.every((match) => match.proposedAction === "conflict")).toBe(
      true,
    );
    expect(
      matches.every((match) => match.errors.includes("duplicate_match_number")),
    ).toBe(true);
  });
});
