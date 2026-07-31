import { describe, expect, it } from "vitest";

import {
  adminSupportedTransitions,
  canAdminModerateSubmission,
  moderateSubmissionInputSchema,
} from "@/lib/domain/moderation";
import { submissionStatuses } from "@/lib/domain/submission";
import { submissionId } from "@/test/admin-fixtures";

const validInput = {
  submission_id: submissionId,
  expected_status: "submitted",
  target_status: "approved",
  reviewer_note: "Looks good",
};

describe("moderateSubmissionInputSchema", () => {
  it("accepts approve with an optional note", () => {
    expect(moderateSubmissionInputSchema.parse(validInput)).toEqual(validInput);
  });

  it("accepts reject with a trimmed note", () => {
    expect(
      moderateSubmissionInputSchema.parse({
        ...validInput,
        target_status: "rejected",
        reviewer_note: "  Missing rules  ",
      }).reviewer_note,
    ).toBe("Missing rules");
  });

  it.each(["rejected", "needs_changes"])(
    "requires a reviewer note for %s",
    (targetStatus) => {
      const result = moderateSubmissionInputSchema.safeParse({
        ...validInput,
        target_status: targetStatus,
        reviewer_note: " ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ["reviewer_note"],
            message: "Reviewer note is required.",
          }),
        );
      }
    },
  );

  it("rejects a note longer than 2,000 characters", () => {
    expect(
      moderateSubmissionInputSchema.safeParse({
        ...validInput,
        reviewer_note: "x".repeat(2001),
      }).success,
    ).toBe(false);
  });

  it("accepts approved to published", () => {
    expect(
      moderateSubmissionInputSchema.safeParse({
        ...validInput,
        expected_status: "approved",
        target_status: "published",
        reviewer_note: "",
      }).success,
    ).toBe(true);
  });

  it.each([
    ["submitted", "published"],
    ["approved", "approved"],
  ])("rejects %s to %s", (expectedStatus, targetStatus) => {
    expect(
      moderateSubmissionInputSchema.safeParse({
        ...validInput,
        expected_status: expectedStatus,
        target_status: targetStatus,
      }).success,
    ).toBe(false);
  });

  it("rejects browser-controlled reviewer identity and metadata", () => {
    expect(
      moderateSubmissionInputSchema.safeParse({
        ...validInput,
        reviewer_id: "bd1f974c-2875-4420-821e-51cd08258e5d",
        metadata: { event_type: "submission_published" },
      }).success,
    ).toBe(false);
  });
});

describe("admin-supported transitions", () => {
  it("keeps the explicit transition matrix synchronized", () => {
    const supported = new Set(
      adminSupportedTransitions.map(([from, to]) => `${from}:${to}`),
    );

    for (const from of submissionStatuses) {
      for (const to of [
        "needs_changes",
        "approved",
        "rejected",
        "published",
      ] as const) {
        expect(canAdminModerateSubmission(from, to)).toBe(
          supported.has(`${from}:${to}`),
        );
      }
    }
  });
});
