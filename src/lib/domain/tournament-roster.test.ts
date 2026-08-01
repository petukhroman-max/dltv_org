import { describe, expect, it } from "vitest";

import { createTournamentRosterMemberSchema } from "@/lib/domain/tournament-roster";
import { playerId, teamAId } from "@/test/tournament-operational-fixtures";

const validRoster = {
  tournament_team_id: teamAId,
  player_id: playerId,
};

describe("tournament roster schema", () => {
  it.each(["player", "substitute", "coach"])("accepts %s role", (role) => {
    expect(
      createTournamentRosterMemberSchema.safeParse({ ...validRoster, role })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid role and left-before-joined dates", () => {
    expect(
      createTournamentRosterMemberSchema.safeParse({
        ...validRoster,
        role: "caster",
      }).success,
    ).toBe(false);
    expect(
      createTournamentRosterMemberSchema.safeParse({
        ...validRoster,
        joined_at: "2026-08-10T10:00:00Z",
        left_at: "2026-08-09T10:00:00Z",
      }).success,
    ).toBe(false);
  });
});
