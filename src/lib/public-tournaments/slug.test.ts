import { describe, expect, it } from "vitest";

import {
  resolveTournamentSlug,
  slugifyTournamentName,
} from "@/lib/public-tournaments/slug";

describe("tournament slug", () => {
  it.each([
    ["DLTV Summer Cup", "dltv-summer-cup"],
    ["  Cup: Season #2!  ", "cup-season-2"],
    ["DLTV    Cup", "dltv-cup"],
    ["Турнир", "tournament"],
  ])("slugifies %s", (title, expected) => {
    expect(slugifyTournamentName(title)).toBe(expected);
  });

  it("limits slugs to 100 characters", () => {
    expect(slugifyTournamentName("a".repeat(150))).toHaveLength(100);
  });

  it("adds a short stable suffix only on conflict", () => {
    expect(
      resolveTournamentSlug({
        title: "DLTV Cup",
        hasConflict: true,
        stableSuffix: "b1f0a925-b6f0-43ab",
      }),
    ).toBe("dltv-cup-b1f0a925b6f0");
  });

  it("preserves an existing slug after a title update", () => {
    expect(
      resolveTournamentSlug({
        title: "Renamed Cup",
        existingSlug: "original-cup",
        hasConflict: false,
        stableSuffix: "ignored",
      }),
    ).toBe("original-cup");
  });
});
