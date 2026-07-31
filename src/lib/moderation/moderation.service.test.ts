import { beforeAll, describe, expect, it, vi } from "vitest";

import type { AdminIdentity } from "@/lib/admin/authorization";
import { submissionId } from "@/test/admin-fixtures";

vi.mock("server-only", () => ({}));

const admin: AdminIdentity = {
  userId: "bd1f974c-2875-4420-821e-51cd08258e5d",
  email: "admin@example.com",
};

const validInput = {
  submission_id: submissionId,
  expected_status: "submitted",
  target_status: "approved",
  reviewer_note: "Looks good",
};

const rpcResult = {
  submission_id: submissionId,
  previous_status: "submitted",
  status: "approved",
  updated_at: "2026-07-31T10:01:00Z",
  reviewed_at: "2026-07-31T10:01:00Z",
  published_at: null,
};

describe("moderateTournamentSubmission", () => {
  let service: typeof import("@/lib/moderation/moderation.service");

  beforeAll(async () => {
    service = await import("@/lib/moderation/moderation.service");
  });

  it("requires a valid admin identity before calling the RPC", async () => {
    const executeRpc = vi.fn();

    await expect(
      service.moderateTournamentSubmission(
        validInput,
        { userId: "browser-value", email: "not-email" },
        executeRpc,
      ),
    ).rejects.toBeInstanceOf(service.ModerationError);
    expect(executeRpc).not.toHaveBeenCalled();
  });

  it("calls the atomic RPC once with reviewer ID from AdminIdentity", async () => {
    const executeRpc = vi.fn().mockResolvedValue(rpcResult);

    await expect(
      service.moderateTournamentSubmission(validInput, admin, executeRpc),
    ).resolves.toEqual(rpcResult);

    expect(executeRpc).toHaveBeenCalledTimes(1);
    expect(executeRpc).toHaveBeenCalledWith({
      p_submission_id: submissionId,
      p_expected_status: "submitted",
      p_target_status: "approved",
      p_reviewer_id: admin.userId,
      p_reviewer_note: "Looks good",
    });
    expect(executeRpc.mock.calls[0][0]).not.toHaveProperty("metadata");
    expect(executeRpc.mock.calls[0][0]).not.toHaveProperty("event_type");
  });

  it("accepts the public projection identity returned by publish", async () => {
    const publishResult = {
      ...rpcResult,
      previous_status: "approved",
      status: "published",
      published_at: "2026-07-31T10:02:00Z",
      public_tournament_id: "538b29db-1b84-47e4-8464-0d22f53f185b",
      slug: "dltv-cup",
    };
    await expect(
      service.moderateTournamentSubmission(
        {
          ...validInput,
          expected_status: "approved",
          target_status: "published",
        },
        admin,
        vi.fn().mockResolvedValue(publishResult),
      ),
    ).resolves.toEqual(publishResult);
  });

  it("maps a database serialization conflict to a safe conflict error", async () => {
    const executeRpc = vi.fn().mockRejectedValue({
      code: "40001",
      message: "raw database detail",
    });

    await expect(
      service.moderateTournamentSubmission(validInput, admin, executeRpc),
    ).rejects.toEqual(new service.ModerationConflictError());
  });

  it("does not expose generic database details", async () => {
    const executeRpc = vi.fn().mockRejectedValue({
      code: "XX000",
      message: "secret database detail",
    });

    let caught: unknown;
    try {
      await service.moderateTournamentSubmission(validInput, admin, executeRpc);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(service.ModerationError);
    expect(String(caught)).not.toContain("secret database detail");
  });

  it("does not call the RPC for an invalid transition", async () => {
    const executeRpc = vi.fn();

    await expect(
      service.moderateTournamentSubmission(
        { ...validInput, target_status: "published" },
        admin,
        executeRpc,
      ),
    ).rejects.toBeInstanceOf(service.ModerationValidationError);
    expect(executeRpc).not.toHaveBeenCalled();
  });
});
