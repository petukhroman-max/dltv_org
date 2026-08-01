import { describe, expect, it } from "vitest";

import { createTournamentTeamSchema } from "@/lib/domain/tournament-team";
import { submissionId } from "@/test/admin-fixtures";

const validTeam = {
  submission_id: submissionId,
  name: " Team Alpha ",
  slug: "team-alpha",
  seed: 1,
  logo_url: "https://example.com/logo.png",
};

describe("tournament team schema", () => {
  it("accepts and trims a valid team", () => {
    expect(createTournamentTeamSchema.parse(validTeam).name).toBe("Team Alpha");
  });

  it.each([
    { name: "" },
    { seed: 0 },
    { logo_url: "javascript:alert(1)" },
    { logo_url: "not-a-url" },
  ])("rejects invalid team input %#", (override) => {
    expect(
      createTournamentTeamSchema.safeParse({ ...validTeam, ...override })
        .success,
    ).toBe(false);
  });
});
