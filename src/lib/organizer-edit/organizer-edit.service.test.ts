import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createSubmissionEditLink,
  getEditableSubmissionByToken,
  getSubmissionEditTokenStatus,
  OrganizerEditError,
  resubmitSubmissionWithToken,
  revokeSubmissionEditLinks,
} from "@/lib/organizer-edit/organizer-edit.service";
import type { EditableSubmission } from "@/lib/organizer-edit/organizer-edit.types";
import { tournamentSubmissionInputSchema } from "@/lib/domain/submission";

const submissionId = "b1f0a925-b6f0-43ab-8e63-a7280fe7a870";
const admin = {
  userId: "397d93ec-7cb7-4829-8217-f07f5b13278b",
  email: "admin@example.com",
};
const rawToken = "A".repeat(43);
const editable: EditableSubmission = {
  id: submissionId,
  tournament_name: "DLTV Cup",
  description: null,
  region: "EU",
  language: null,
  start_date: "2026-08-10",
  end_date: "2026-08-12",
  timezone: "Europe/Berlin",
  format: null,
  prize_pool_text: null,
  registration_url: null,
  bracket_url: null,
  discord_url: null,
  stream_url: null,
  rules_url: null,
  is_online: true,
  max_teams: null,
  registration_deadline: null,
  organizer_notes: null,
  reviewer_notes: "Update dates",
};

beforeEach(() => vi.clearAllMocks());

describe("organizer edit service", () => {
  it("creates a seven-day link while sending only the hash to the RPC", async () => {
    const execute = vi.fn().mockResolvedValue({
      id: "8a961b0b-aea5-4642-8167-7ce4967ae2d7",
      submission_id: submissionId,
      expires_at: "2026-08-07T10:00:00.000Z",
      created_at: "2026-07-31T10:00:00.000Z",
    });
    const result = await createSubmissionEditLink(
      submissionId,
      admin,
      new Date("2026-07-31T10:00:00.000Z"),
      execute,
      () => rawToken,
      "https://portal.example.com",
    );
    expect(result.editUrl).toBe(
      `https://portal.example.com/edit-submission/${rawToken}`,
    );
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_created_by: admin.userId,
        p_expires_at: "2026-08-07T10:00:00.000Z",
        p_token_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(execute.mock.calls[0][0].p_token_hash).not.toBe(rawToken);
  });

  it("derives active, used, revoked and expired admin states without a hash", async () => {
    const base = {
      id: "8a961b0b-aea5-4642-8167-7ce4967ae2d7",
      expires_at: "2026-08-07T10:00:00.000Z",
      created_at: "2026-07-31T10:00:00.000Z",
      used_at: null,
      revoked_at: null,
    };
    const now = new Date("2026-08-01T10:00:00.000Z");
    await expect(
      getSubmissionEditTokenStatus(submissionId, async () => base, now),
    ).resolves.toMatchObject({ state: "active" });
    await expect(
      getSubmissionEditTokenStatus(
        submissionId,
        async () => ({ ...base, used_at: now.toISOString() }),
        now,
      ),
    ).resolves.toMatchObject({ state: "used" });
    await expect(
      getSubmissionEditTokenStatus(
        submissionId,
        async () => ({ ...base, revoked_at: now.toISOString() }),
        now,
      ),
    ).resolves.toMatchObject({ state: "revoked" });
    await expect(
      getSubmissionEditTokenStatus(
        submissionId,
        async () => ({ ...base, expires_at: "2026-07-31T11:00:00.000Z" }),
        now,
      ),
    ).resolves.toMatchObject({ state: "expired" });
  });

  it("returns the same null result for malformed, unavailable and failed lookups", async () => {
    const finder = vi.fn().mockResolvedValue(null);
    await expect(
      getEditableSubmissionByToken("bad", finder),
    ).resolves.toBeNull();
    await expect(
      getEditableSubmissionByToken(rawToken, finder),
    ).resolves.toBeNull();
    await expect(
      getEditableSubmissionByToken(
        rawToken,
        vi.fn().mockRejectedValue(new Error("db")),
      ),
    ).resolves.toBeNull();
  });

  it("returns the allowlisted editable record for an active token", async () => {
    await expect(
      getEditableSubmissionByToken(rawToken, async () => editable),
    ).resolves.toEqual(editable);
  });

  it("passes admin identity to atomic revocation and wraps failures", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ submission_id: submissionId, revoked_count: 1 });
    await expect(
      revokeSubmissionEditLinks(submissionId, admin, execute),
    ).resolves.toMatchObject({ revoked_count: 1 });
    expect(execute).toHaveBeenCalledWith({
      p_submission_id: submissionId,
      p_reviewer_id: admin.userId,
    });
    await expect(
      revokeSubmissionEditLinks(
        submissionId,
        admin,
        vi.fn().mockRejectedValue(new Error("db")),
      ),
    ).rejects.toBeInstanceOf(OrganizerEditError);
  });

  it("hashes the token and sends validated submission data to the atomic RPC", async () => {
    const execute = vi.fn().mockResolvedValue({
      submission_id: submissionId,
      status: "submitted",
      submitted_at: "2026-07-31T10:00:00.000Z",
    });
    const submission = tournamentSubmissionInputSchema.parse(editable);
    await expect(
      resubmitSubmissionWithToken(rawToken, submission, execute),
    ).resolves.toMatchObject({ status: "submitted" });
    expect(execute.mock.calls[0][0].p_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(execute.mock.calls[0][0].p_submission).not.toHaveProperty(
      "reviewer_notes",
    );
  });
});
