import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => cache);
vi.mock("server-only", () => ({}));

import {
  publicTournamentProjectionTag,
  revalidatePublicTournamentProjection,
} from "@/lib/public-tournaments/public-operational.revalidation";

describe("public operational revalidation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revalidates both locale paths using a server-resolved published slug", async () => {
    const resolve = vi.fn(async () => "dltv-cup");
    await expect(
      revalidatePublicTournamentProjection("trusted-submission-id", resolve),
    ).resolves.toBe(true);
    expect(resolve).toHaveBeenCalledWith("trusted-submission-id");
    expect(cache.revalidateTag).toHaveBeenCalledWith(
      publicTournamentProjectionTag("dltv-cup"),
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith(
      "/en/tournaments/dltv-cup",
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith(
      "/ru/tournaments/dltv-cup",
    );
  });

  it("does not invalidate public caches for an unpublished tournament", async () => {
    await expect(
      revalidatePublicTournamentProjection(
        "trusted-submission-id",
        async () => null,
      ),
    ).resolves.toBe(false);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalled();
  });
});
