import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.service";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

function dependencies(
  resolve: () => Promise<typeof publishedTournamentFixture | null>,
) {
  return {
    resolve: vi.fn(resolve),
    stages: vi.fn(async () => []),
    teams: vi.fn(async () => []),
    rosters: vi.fn(async () => []),
    matches: vi.fn(async () => []),
  };
}

describe("public tournament projection service", () => {
  it("does not query operational tables when the published slug boundary fails", async () => {
    const deps = dependencies(async () => null);
    await expect(
      getPublicTournamentProjection("hidden", "en", deps),
    ).resolves.toBeNull();
    expect(deps.stages).not.toHaveBeenCalled();
    expect(deps.teams).not.toHaveBeenCalled();
    expect(deps.rosters).not.toHaveBeenCalled();
    expect(deps.matches).not.toHaveBeenCalled();
  });

  it("derives the trusted submission ID only from the published slug result", async () => {
    const deps = dependencies(async () => publishedTournamentFixture);
    const projection = await getPublicTournamentProjection(
      "dltv-cup",
      "ru",
      deps,
    );
    for (const loader of [
      deps.stages,
      deps.teams,
      deps.rosters,
      deps.matches,
    ]) {
      expect(loader).toHaveBeenCalledWith(
        publishedTournamentFixture.submission_id,
      );
    }
    expect(projection?.locale).toBe("ru");
    expect(projection?.tournament).not.toHaveProperty("submission_id");
    expect(projection?.tournament).not.toHaveProperty("id");
  });
});
