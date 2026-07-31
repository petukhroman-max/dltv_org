import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getPublishedTournamentBySlug,
  listPublishedTournaments,
  type CategoryExecutor,
} from "@/lib/public-tournaments/public-tournaments.repository";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("public tournament repository", () => {
  it("combines all lifecycle groups in requested priority order", async () => {
    const execute: CategoryExecutor = vi.fn(async ({ lifecycle }) => ({
      rows: [{ ...publishedTournamentFixture, id: lifecycle, slug: lifecycle }],
      count: 1,
    }));
    const result = await listPublishedTournaments({}, execute, "2026-08-10");
    expect(result.tournaments.map((row) => row.id)).toEqual([
      "ongoing",
      "upcoming",
      "completed",
    ]);
    expect(result.total).toBe(3);
  });

  it("applies lifecycle, region and server pagination", async () => {
    const execute: CategoryExecutor = vi
      .fn()
      .mockResolvedValue({ rows: [publishedTournamentFixture], count: 45 });
    const result = await listPublishedTournaments(
      { lifecycle: "upcoming", region: "EU", page: 2, limit: 20 },
      execute,
      "2026-08-01",
    );
    expect(execute).toHaveBeenCalledWith({
      lifecycle: "upcoming",
      region: "EU",
      today: "2026-08-01",
      from: 20,
      to: 39,
    });
    expect(result).toMatchObject({ page: 2, limit: 20, totalPages: 3 });
  });

  it("returns only the executor's visible slug result", async () => {
    await expect(
      getPublishedTournamentBySlug(
        "dltv-cup",
        async () => publishedTournamentFixture,
      ),
    ).resolves.toEqual(publishedTournamentFixture);
    await expect(
      getPublishedTournamentBySlug("hidden-cup", async () => null),
    ).resolves.toBeNull();
    await expect(
      getPublishedTournamentBySlug("INVALID", vi.fn()),
    ).resolves.toBeNull();
  });
});
