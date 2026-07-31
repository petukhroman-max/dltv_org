import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/moderation/moderation.service", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/moderation/moderation.service")
    >();
  return { ...actual, moderateTournamentSubmission: vi.fn() };
});

import {
  approveSubmissionAction,
  publishSubmissionAction,
  rejectSubmissionAction,
  requestChangesAction,
} from "@/app/admin/(protected)/submissions/[id]/actions";
import { requireAdmin } from "@/lib/admin/require-admin";
import { moderateTournamentSubmission } from "@/lib/moderation/moderation.service";
import { submissionId } from "@/test/admin-fixtures";

const admin = {
  userId: "bd1f974c-2875-4420-821e-51cd08258e5d",
  email: "admin@example.com",
};

function actionForm(expectedStatus: string, confirmed = true) {
  const formData = new FormData();
  formData.set("submission_id", submissionId);
  formData.set("expected_status", expectedStatus);
  formData.set("reviewer_note", "Reviewed note");
  if (confirmed) {
    formData.set("confirmed", "on");
  }
  return formData;
}

describe("moderation server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue(admin);
    vi.mocked(moderateTournamentSubmission).mockResolvedValue({
      submission_id: submissionId,
      previous_status: "submitted",
      status: "approved",
      updated_at: "2026-07-31T10:01:00Z",
      reviewed_at: "2026-07-31T10:01:00Z",
      published_at: null,
    });
  });

  it.each([
    [approveSubmissionAction, "submitted", "approved"],
    [rejectSubmissionAction, "submitted", "rejected"],
    [requestChangesAction, "published", "needs_changes"],
    [publishSubmissionAction, "approved", "published"],
  ] as const)(
    "requires admin identity and fixes the server target",
    async (action, expectedStatus, targetStatus) => {
      await action({ status: "idle" }, actionForm(expectedStatus));

      expect(requireAdmin).toHaveBeenCalledTimes(1);
      expect(moderateTournamentSubmission).toHaveBeenCalledWith(
        {
          submission_id: submissionId,
          expected_status: expectedStatus,
          target_status: targetStatus,
          reviewer_note: "Reviewed note",
        },
        admin,
      );
    },
  );

  it("requires explicit confirmation without calling the service", async () => {
    const state = await rejectSubmissionAction(
      { status: "idle" },
      actionForm("submitted", false),
    );

    expect(requireAdmin).toHaveBeenCalledTimes(1);
    expect(moderateTournamentSubmission).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "error",
      fieldErrors: {
        confirmed: "Confirm this moderation action to continue.",
      },
    });
  });
});
