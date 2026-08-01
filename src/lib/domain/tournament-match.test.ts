import { describe, expect, it } from "vitest";

import { createTournamentMatchSchema } from "@/lib/domain/tournament-match";
import { submissionId } from "@/test/admin-fixtures";
import { teamAId, teamBId } from "@/test/tournament-operational-fixtures";

const scheduledMatch = {
  submission_id: submissionId,
  status: "scheduled",
  scheduled_at: "2026-08-10T12:00:00+02:00",
  team_a_id: null,
  team_b_id: null,
  score_a: null,
  score_b: null,
  winner_team_id: null,
  best_of: 3,
};

describe("tournament match schema", () => {
  it("accepts scheduled TBD teams", () => {
    expect(createTournamentMatchSchema.safeParse(scheduledMatch).success).toBe(
      true,
    );
  });

  it("accepts a consistent completed result", () => {
    expect(
      createTournamentMatchSchema.safeParse({
        ...scheduledMatch,
        status: "completed",
        team_a_id: teamAId,
        team_b_id: teamBId,
        score_a: 2,
        score_b: 1,
        winner_team_id: teamAId,
      }).success,
    ).toBe(true);
  });

  it("requires a winner for completed matches", () => {
    expect(
      createTournamentMatchSchema.safeParse({
        ...scheduledMatch,
        status: "completed",
        team_a_id: teamAId,
        team_b_id: teamBId,
        score_a: 2,
        score_b: 1,
      }).success,
    ).toBe(false);
  });

  it.each([
    { team_a_id: teamAId, team_b_id: teamAId },
    {
      status: "completed",
      team_a_id: teamAId,
      team_b_id: teamBId,
      score_a: 2,
      score_b: 1,
      winner_team_id: submissionId,
    },
    {
      status: "completed",
      team_a_id: teamAId,
      team_b_id: teamBId,
      score_a: 1,
      score_b: 2,
      winner_team_id: teamAId,
    },
    { score_a: -1 },
    { best_of: 2 },
    { stream_url: "ftp://example.com/live" },
    { vod_url: "not-a-url" },
    { scheduled_at: "2026-08-10T12:00:00" },
  ])("rejects invalid match input %#", (override) => {
    expect(
      createTournamentMatchSchema.safeParse({
        ...scheduledMatch,
        ...override,
      }).success,
    ).toBe(false);
  });

  it("accepts a walkover with a participant winner and null scores", () => {
    expect(
      createTournamentMatchSchema.safeParse({
        ...scheduledMatch,
        status: "walkover",
        team_a_id: teamAId,
        winner_team_id: teamAId,
      }).success,
    ).toBe(true);
  });
});
