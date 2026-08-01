import { describe, expect, it } from "vitest";

import { toPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.mapper";
import type {
  PublicMatchRow,
  PublicRosterRow,
  PublicStageRow,
  PublicTeamRow,
} from "@/lib/public-tournaments/public-operational.types";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

const submissionId = publishedTournamentFixture.submission_id;
const stageId = "10000000-0000-4000-8000-000000000001";
const teamAId = "20000000-0000-4000-8000-000000000001";
const teamBId = "20000000-0000-4000-8000-000000000002";

function stage(overrides: Partial<PublicStageRow> = {}): PublicStageRow {
  return {
    id: stageId,
    submission_id: submissionId,
    name: "Playoffs",
    slug: "playoffs",
    stage_type: "playoff",
    sequence_number: 1,
    start_at: null,
    end_at: null,
    timezone: "Europe/Berlin",
    format_text: "Single elimination",
    best_of_default: 3,
    team_count: 8,
    is_online: true,
    location_name: null,
    status: "active",
    is_public: true,
    ...overrides,
  };
}

function team(
  id: string,
  name: string,
  overrides: Partial<PublicTeamRow> = {},
): PublicTeamRow {
  return {
    id,
    submission_id: submissionId,
    name,
    short_name: name.slice(0, 3).toUpperCase(),
    slug: name.toLowerCase(),
    logo_url: null,
    region: "EU",
    seed: 1,
    status: "active",
    is_public: true,
    ...overrides,
  };
}

function match(
  id: string,
  status: string,
  overrides: Partial<PublicMatchRow> = {},
): PublicMatchRow {
  return {
    id,
    submission_id: submissionId,
    stage_id: stageId,
    match_number: 1,
    round_name: "Round 1",
    group_name: null,
    scheduled_at: "2026-08-10T10:00:00Z",
    best_of: 3,
    team_a_id: teamAId,
    team_b_id: teamBId,
    score_a: null,
    score_b: null,
    winner_team_id: null,
    status,
    deadlock_match_id: "internal-match-reference",
    stream_url: "https://example.com/live",
    vod_url: null,
    duration_seconds: null,
    is_public: true,
    ...overrides,
  };
}

describe("public operational projection mapper", () => {
  it("returns an allowlisted model without raw IDs or player private fields", () => {
    const rosterRows = [
      {
        tournament_team_id: teamAId,
        role: "player",
        is_captain: true,
        is_active: true,
        player: {
          display_name: "Ace",
          country_code: "DE",
          is_public: true,
          real_name: "Private Name",
          steam_id: "private-steam",
          normalized_name: "ace",
        },
      },
    ] as unknown as PublicRosterRow[];
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [stage()],
      teamRows: [team(teamAId, "Radiant"), team(teamBId, "Dire")],
      rosterRows,
      matchRows: [match("30000000-0000-4000-8000-000000000001", "scheduled")],
    });
    const serialized = JSON.stringify(projection);
    for (const forbidden of [
      submissionId,
      stageId,
      teamAId,
      "30000000-0000-4000-8000-000000000001",
      "Private Name",
      "private-steam",
      '"real_name"',
      '"normalized_name"',
      '"source"',
      '"updated_at"',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(
      projection.teams.find((item) => item.slug === "radiant")?.roster[0],
    ).toEqual({
      display_name: "Ace",
      country_code: "DE",
      role: "player",
      is_captain: true,
    });
  });

  it("filters private entities, draft matches, inactive members, and unsafe cancelled rows", () => {
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [
        stage(),
        stage({ id: "private-stage", slug: "private", is_public: false }),
      ],
      teamRows: [
        team(teamAId, "Radiant", { logo_url: "javascript:alert(1)" }),
        team(teamBId, "Dire", { is_public: false }),
      ],
      rosterRows: [
        {
          tournament_team_id: teamAId,
          role: "player",
          is_captain: false,
          is_active: false,
          player: {
            display_name: "Former",
            country_code: null,
            is_public: true,
          },
        },
        {
          tournament_team_id: teamAId,
          role: "player",
          is_captain: false,
          is_active: true,
          player: {
            display_name: "Hidden",
            country_code: null,
            is_public: false,
          },
        },
      ],
      matchRows: [
        match("draft", "draft"),
        match("private", "scheduled", { is_public: false }),
        match("unknown", "internal_only"),
        match("cancelled", "cancelled", {
          scheduled_at: null,
          team_a_id: null,
          team_b_id: null,
        }),
        match("visible", "scheduled", { team_b_id: null }),
      ],
    });
    expect(projection.stages.map((item) => item.slug)).toEqual(["playoffs"]);
    expect(projection.teams).toHaveLength(1);
    expect(projection.teams[0].logo_url).toBeNull();
    expect(projection.teams[0].roster).toEqual([]);
    expect(projection.matches.upcoming).toHaveLength(1);
    expect(projection.matches.upcoming[0].team_b).toBeNull();
  });

  it("orders lifecycle groups deterministically and limits technical references", () => {
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [stage()],
      teamRows: [team(teamAId, "Radiant"), team(teamBId, "Dire")],
      rosterRows: [],
      matchRows: [
        match("completed-old", "completed", {
          scheduled_at: "2026-08-08T10:00:00Z",
          score_a: 2,
          score_b: 1,
          winner_team_id: teamAId,
        }),
        match("scheduled-late", "scheduled", {
          scheduled_at: "2026-08-12T10:00:00Z",
        }),
        match("live", "live"),
        match("scheduled-next", "scheduled", {
          scheduled_at: "2026-08-11T10:00:00Z",
        }),
        match("completed-new", "completed", {
          scheduled_at: "2026-08-09T10:00:00Z",
          score_a: 1,
          score_b: 2,
          winner_team_id: teamBId,
        }),
        match("unscheduled", "scheduled", { scheduled_at: null }),
      ],
    });
    expect(projection.matches.live[0].deadlock_match_id).toBe(
      "internal-match-reference",
    );
    expect(
      projection.matches.upcoming.map((item) => item.scheduled_at),
    ).toEqual(["2026-08-11T10:00:00Z", "2026-08-12T10:00:00Z"]);
    expect(projection.matches.upcoming[0].deadlock_match_id).toBeNull();
    expect(projection.matches.results.map((item) => item.scheduled_at)).toEqual(
      ["2026-08-09T10:00:00Z", "2026-08-08T10:00:00Z"],
    );
    expect(projection.matches.unscheduled).toHaveLength(1);
    expect(projection.summary.live_matches).toBe(1);
  });

  it("sanitizes corrupt legacy match references and reports safe warning codes", () => {
    const warnings: string[] = [];
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [stage()],
      teamRows: [team(teamAId, "Radiant"), team(teamBId, "Dire")],
      rosterRows: [],
      matchRows: [
        match("cross-references", "live", {
          stage_id: "stage-from-another-tournament",
          team_b_id: "team-from-another-tournament",
          winner_team_id: teamBId,
          scheduled_at: "not-a-date",
          score_a: 1,
          score_b: null,
          stream_url: "javascript:alert(1)",
          vod_url: "data:text/plain,private",
          duration_seconds: -5,
        }),
      ],
      onWarning: (code) => warnings.push(code),
    });
    const publicMatch = projection.matches.live[0];
    expect(publicMatch.stage).toBeNull();
    expect(publicMatch.team_b).toBeNull();
    expect(publicMatch.winner).toBeNull();
    expect(publicMatch.scheduled_at).toBeNull();
    expect(publicMatch.score_a).toBeNull();
    expect(publicMatch.score_b).toBeNull();
    expect(publicMatch.stream_url).toBeNull();
    expect(publicMatch.vod_url).toBeNull();
    expect(publicMatch.duration_seconds).toBeNull();
    expect(warnings).toEqual(
      expect.arrayContaining([
        "match_stage_not_public",
        "match_team_not_public",
        "match_winner_not_participant",
        "match_invalid_schedule",
        "match_invalid_score",
        "invalid_public_url",
      ]),
    );
    expect(JSON.stringify(warnings)).not.toContain("cross-references");
  });

  it("does not publish an incomplete completed result", () => {
    const warnings: string[] = [];
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [stage()],
      teamRows: [team(teamAId, "Radiant"), team(teamBId, "Dire")],
      rosterRows: [],
      matchRows: [match("incomplete", "completed", { score_a: 2 })],
      onWarning: (code) => warnings.push(code),
    });
    expect(projection.matches.results).toEqual([]);
    expect(projection.matches.unscheduled).toEqual([]);
    expect(warnings).toEqual(["completed_match_incomplete_score"]);
  });

  it("groups postponed, cancelled, and walkover states explicitly", () => {
    const projection = toPublicTournamentProjection({
      locale: "en",
      tournament: publishedTournamentFixture,
      stageRows: [stage()],
      teamRows: [team(teamAId, "Radiant"), team(teamBId, "Dire")],
      rosterRows: [],
      matchRows: [
        match("postponed", "postponed"),
        match("cancelled", "cancelled"),
        match("walkover", "walkover", { winner_team_id: teamAId }),
      ],
    });
    expect(projection.matches.upcoming.map((item) => item.status)).toEqual([
      "postponed",
      "cancelled",
    ]);
    expect(projection.matches.results[0]).toMatchObject({
      status: "walkover",
      winner: { slug: "radiant" },
    });
  });
});
