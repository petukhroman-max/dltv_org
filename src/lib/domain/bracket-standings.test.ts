import { describe, expect, it } from "vitest";
import {
  bracketLinkSchema,
  bracketPositionSchema,
  calculateStandings,
  standingAdjustmentSchema,
  standingsConfigSchema,
  validateStageBracket,
} from "@/lib/domain/bracket-standings";

const one = "11111111-1111-4111-8111-111111111111";
const two = "22222222-2222-4222-8222-222222222222";

describe("bracket and standings domain validation", () => {
  it("accepts valid coordinates and rejects incomplete or non-positive positions", () => {
    expect(
      bracketPositionSchema.safeParse({
        match_id: one,
        expected_updated_at: "2026-08-02T00:00:00.000Z",
        bracket_type: "double_elimination",
        section: "losers",
        round: "2",
        position: "1",
      }).success,
    ).toBe(true);
    expect(
      bracketPositionSchema.safeParse({
        match_id: one,
        expected_updated_at: "2026-08-02T00:00:00.000Z",
        bracket_type: "single_elimination",
        section: "main",
        round: "0",
        position: "1",
      }).success,
    ).toBe(false);
  });

  it("reports incomplete positions and links outside the stage model", () => {
    const result = validateStageBracket(
      [
        {
          id: one,
          bracket_section: null,
          bracket_round: null,
          bracket_position: null,
        },
      ],
      [
        {
          id: two,
          source_match_id: one,
          target_match_id: two,
        },
      ],
    );
    expect(result).toEqual({
      valid: false,
      unpositionedMatchIds: [one],
      invalidLinkIds: [two],
    });
  });

  it("rejects self-links and unsupported outcomes", () => {
    expect(
      bracketLinkSchema.safeParse({
        stage_id: one,
        source_match_id: two,
        outcome: "winner",
        target_match_id: two,
        target_slot: "team_a",
      }).success,
    ).toBe(false);
    expect(
      bracketLinkSchema.safeParse({
        stage_id: one,
        source_match_id: one,
        outcome: "draw",
        target_match_id: two,
        target_slot: "team_b",
      }).success,
    ).toBe(false);
  });

  it("normalizes standings configuration and bounded public adjustments", () => {
    const config = standingsConfigSchema.parse({
      stage_id: one,
      enabled: "on",
      points_for_win: "3",
      points_for_loss: "0",
      points_for_walkover: "3",
      score_difference_enabled: "on",
      qualification_places: "",
      calculation_mode: "automatic",
    });
    expect(config).toMatchObject({
      enabled: true,
      points_for_win: 3,
      points_for_loss: 0,
      points_for_walkover: 3,
      qualification_places: null,
    });
    expect(
      standingAdjustmentSchema.safeParse({
        stage_id: one,
        team_id: two,
        points_adjustment: "-1",
        rank_override: "",
        qualified_override: "",
        public_note: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("standings calculation", () => {
  const teams = [
    { id: one, name: "Alpha", slug: "alpha", seed: 2 },
    { id: two, name: "Beta", slug: "beta", seed: 1 },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Gamma",
      slug: "gamma",
      seed: null,
    },
  ];
  const config = {
    points_for_win: 3,
    points_for_loss: 0,
    points_for_walkover: 2,
    score_difference_enabled: true,
    qualification_places: 1,
  };

  it("counts completed and walkover games while ignoring scheduled/live games", () => {
    const rows = calculateStandings({
      teams,
      groups: teams.map((team) => ({ team_id: team.id, group_name: "A" })),
      matches: [
        {
          status: "completed",
          group_name: "A",
          team_a_id: one,
          team_b_id: two,
          score_a: 2,
          score_b: 1,
          winner_team_id: one,
        },
        {
          status: "walkover",
          group_name: "A",
          team_a_id: two,
          team_b_id: teams[2].id,
          score_a: null,
          score_b: null,
          winner_team_id: two,
        },
        {
          status: "scheduled",
          group_name: "A",
          team_a_id: one,
          team_b_id: teams[2].id,
          score_a: null,
          score_b: null,
          winner_team_id: null,
        },
        {
          status: "live",
          group_name: "A",
          team_a_id: two,
          team_b_id: one,
          score_a: null,
          score_b: null,
          winner_team_id: null,
        },
      ],
      adjustments: [],
      config,
    });
    expect(rows.find((row) => row.team_id === one)).toMatchObject({
      played: 1,
      wins: 1,
      losses: 0,
      score_for: 2,
      score_against: 1,
      score_diff: 1,
      points: 3,
      rank: 1,
      qualified: true,
    });
    expect(rows.find((row) => row.team_id === two)).toMatchObject({
      played: 2,
      wins: 1,
      losses: 1,
      points: 2,
    });
    expect(rows.find((row) => row.team_id === teams[2].id)).toMatchObject({
      played: 1,
      wins: 0,
      losses: 1,
    });
  });

  it("includes zero-match teams and applies points, rank and qualification overrides", () => {
    const rows = calculateStandings({
      teams,
      groups: teams.map((team) => ({ team_id: team.id, group_name: "A" })),
      matches: [],
      adjustments: [
        {
          team_id: teams[2].id,
          points_adjustment: 5,
          rank_override: 1,
          qualified_override: false,
          public_note: "Penalty reviewed",
        },
      ],
      config,
    });
    expect(rows[0]).toMatchObject({
      team_name: "Gamma",
      played: 0,
      points: 5,
      rank: 1,
      qualified: false,
      public_note: "Penalty reviewed",
    });
  });

  it("uses deterministic seed and name fallbacks without head-to-head logic", () => {
    const rows = calculateStandings({
      teams,
      groups: teams.map((team) => ({ team_id: team.id, group_name: "A" })),
      matches: [],
      adjustments: [],
      config: { ...config, qualification_places: null },
    });
    expect(rows.map((row) => row.team_name)).toEqual([
      "Beta",
      "Alpha",
      "Gamma",
    ]);
  });
});
