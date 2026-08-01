import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const repository = vi.hoisted(() => ({
  executeCreateMatchRpc: vi.fn(),
  executeUpdateMatchRpc: vi.fn(),
  executeUpdateMatchStatusRpc: vi.fn(),
  executeCompleteMatchRpc: vi.fn(),
  executeCancelMatchRpc: vi.fn(),
  executeReopenMatchRpc: vi.fn(),
  executeDeleteMatchRpc: vi.fn(),
  selectTournamentMatch: vi.fn(),
  selectTournamentMatches: vi.fn(),
}));

vi.mock("@/lib/operational-workspace/match.repository", () => repository);

import { runMatchMutation } from "@/lib/operational-workspace/match-action-runner";
import { submissionId } from "@/test/admin-fixtures";
import {
  makeMatch,
  stageId,
  teamAId,
  teamBId,
} from "@/test/tournament-operational-fixtures";

const context = {
  kind: "organizer_workspace" as const,
  submissionId,
  tokenId: "da5096d0-eaca-4615-a2e4-602a564ec25e",
};

function createForm(intent: "draft" | "schedule" = "draft") {
  const form = new FormData();
  form.set("intent", intent);
  form.set("stage_id", stageId);
  form.set("scheduled_date", "2026-08-10");
  form.set("scheduled_time", "14:00");
  form.set("timezone", "Europe/Berlin");
  form.set("best_of", "3");
  form.set("team_a_id", teamAId);
  form.set("team_b_id", teamBId);
  form.set("source", "imported");
  form.set("is_public", "on");
  return form;
}

describe("match action runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.executeCreateMatchRpc.mockResolvedValue({
      id: makeMatch().id,
      submission_id: submissionId,
      status: "draft",
      updated_at: makeMatch().updated_at,
    });
  });

  it("converts tournament-local schedule input to UTC and never accepts source", async () => {
    const result = await runMatchMutation(
      "create",
      submissionId,
      context,
      createForm("schedule"),
    );

    expect(result.status).toBe("success");
    expect(repository.executeCreateMatchRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_payload: expect.objectContaining({
          scheduled_at: "2026-08-10T12:00:00.000Z",
          status: "scheduled",
        }),
      }),
    );
    const payload = repository.executeCreateMatchRpc.mock.calls[0][0].p_payload;
    expect(payload).not.toHaveProperty("timezone");
    expect(payload).not.toHaveProperty("source");
  });

  it("creates a draft with null stage and teams through the action boundary", async () => {
    const form = new FormData();
    form.set("intent", "draft");
    form.set("locale", "ru");
    form.set("submission_id", "79fc64c9-fe4f-486d-a959-1fe31d546ef0");

    const result = await runMatchMutation(
      "create",
      submissionId,
      context,
      form,
    );

    expect(result.status).toBe("success");
    expect(repository.executeCreateMatchRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_workspace_token_id: context.tokenId,
        p_payload: expect.objectContaining({
          stage_id: null,
          team_a_id: null,
          team_b_id: null,
          status: "draft",
        }),
      }),
    );
  });

  it("creates a scheduled match with one TBD team through the action boundary", async () => {
    const form = createForm("schedule");
    form.delete("team_b_id");

    const result = await runMatchMutation(
      "create",
      submissionId,
      context,
      form,
    );

    expect(result.status).toBe("success");
    expect(repository.executeCreateMatchRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_payload: expect.objectContaining({
          stage_id: stageId,
          team_a_id: teamAId,
          team_b_id: null,
          status: "scheduled",
        }),
      }),
    );
  });

  it("returns field validation for an invalid IANA timezone", async () => {
    const form = createForm("schedule");
    form.set("timezone", "Mars/Olympus");
    const result = await runMatchMutation(
      "create",
      submissionId,
      context,
      form,
    );

    expect(result.status).toBe("error");
    expect(result.fieldErrors).toHaveProperty("scheduled_at");
    expect(repository.executeCreateMatchRpc).not.toHaveBeenCalled();
  });

  it("localizes stable concurrency errors and hides database details", async () => {
    repository.selectTournamentMatch.mockResolvedValue(makeMatch());
    repository.executeUpdateMatchStatusRpc.mockRejectedValue({
      code: "40001",
      message: "match_stale_update secret database detail",
    });
    const form = new FormData();
    form.set("locale", "ru");
    form.set("id", makeMatch().id);
    form.set("expected_updated_at", makeMatch().updated_at);

    const result = await runMatchMutation("start", submissionId, context, form);

    expect(result.status).toBe("conflict");
    expect(result.message).not.toContain("secret database detail");
    expect(result.message).toContain("Матч");
  });
});
