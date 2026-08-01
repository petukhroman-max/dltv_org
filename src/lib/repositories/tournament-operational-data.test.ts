import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RepositoryError } from "@/lib/repositories/repository-error";
import {
  getTournamentOperationalSummary,
  listTournamentMatches,
  listTournamentRosters,
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";
import { submissionId } from "@/test/admin-fixtures";
import {
  makeMatch,
  makeRoster,
  makeStage,
  makeTeam,
} from "@/test/tournament-operational-fixtures";

describe("tournament operational repositories", () => {
  it("sorts stages by sequence", async () => {
    const rows = await listTournamentStages(submissionId, async () => [
      makeStage({ id: "2", sequence_number: 2 }),
      makeStage({ id: "1", sequence_number: 1 }),
    ]);
    expect(rows.map((row) => row.sequence_number)).toEqual([1, 2]);
  });

  it("sorts seeded teams first and null seeds by name", async () => {
    const rows = await listTournamentTeams(submissionId, async () => [
      makeTeam({ id: "z", name: "Zulu", seed: null }),
      makeTeam({ id: "a", name: "Alpha", seed: null }),
      makeTeam({ id: "s", name: "Seeded", seed: 2 }),
    ]);
    expect(rows.map((row) => row.name)).toEqual(["Seeded", "Alpha", "Zulu"]);
  });

  it("sorts matches by schedule, stage, and match number", async () => {
    const rows = await listTournamentMatches(submissionId, async () => [
      makeMatch({ id: "late", scheduled_at: null }),
      makeMatch({ id: "two", match_number: 2 }),
      makeMatch({ id: "one", match_number: 1 }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["one", "two", "late"]);
  });

  it("sorts roster rows and strips any accidental real_name value", async () => {
    const leaked = {
      ...makeRoster(),
      player: { ...makeRoster().player, real_name: "Private Name" },
    };
    const rows = await listTournamentRosters(
      submissionId,
      async () => [leaked] as never,
    );
    expect(rows[0].player).not.toHaveProperty("real_name");
  });

  it("returns operational summary counts", async () => {
    await expect(
      getTournamentOperationalSummary(submissionId, async () => ({
        stages_count: 2,
        teams_count: 4,
        players_count: 24,
        matches_count: 10,
        scheduled_matches_count: 6,
        completed_matches_count: 4,
      })),
    ).resolves.toMatchObject({ players_count: 24, matches_count: 10 });
  });

  it("validates submission IDs and converts database errors", async () => {
    const execute = vi.fn(async () => {
      throw new Error("relation secret");
    });
    await expect(listTournamentStages("invalid", execute)).rejects.toThrow();
    expect(execute).not.toHaveBeenCalled();
    await expect(
      listTournamentStages(submissionId, execute),
    ).rejects.toBeInstanceOf(RepositoryError);
    await expect(
      listTournamentStages(submissionId, execute),
    ).rejects.not.toThrow(/relation secret/);
  });
});
