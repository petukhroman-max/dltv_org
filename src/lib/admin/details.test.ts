import { describe, expect, it, vi } from "vitest";

import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { submissionId } from "@/test/admin-fixtures";

describe("loadAdminSubmissionDetails", () => {
  it("does not query the repository for a malformed id", async () => {
    const load = vi.fn();
    const handleNotFound = vi.fn(() => {
      throw new Error("not found");
    });

    await expect(
      loadAdminSubmissionDetails("invalid", load, handleNotFound),
    ).rejects.toThrow("not found");
    expect(load).not.toHaveBeenCalled();
  });

  it("uses not found when the repository has no matching submission", async () => {
    const handleNotFound = vi.fn(() => {
      throw new Error("not found");
    });

    await expect(
      loadAdminSubmissionDetails(
        submissionId,
        vi.fn().mockResolvedValue(null),
        handleNotFound,
      ),
    ).rejects.toThrow("not found");
  });

  it("returns repository details for a valid id", async () => {
    const details = { id: submissionId };

    await expect(
      loadAdminSubmissionDetails(
        submissionId,
        vi.fn().mockResolvedValue(details),
        () => {
          throw new Error("not found");
        },
      ),
    ).resolves.toBe(details);
  });
});
