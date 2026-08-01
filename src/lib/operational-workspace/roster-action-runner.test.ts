import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const repository = vi.hoisted(() => ({
  executeCreatePlayerAndAddRpc: vi.fn(),
  executeAddExistingPlayerRpc: vi.fn(),
  executeUpdatePlayerRpc: vi.fn(),
  executeUpdateMembershipRpc: vi.fn(),
  executeRemoveMembershipRpc: vi.fn(),
  executeRestoreMembershipRpc: vi.fn(),
  executePlayerSearchRpc: vi.fn(),
  executeListTeamRoster: vi.fn(),
}));

vi.mock("@/lib/operational-workspace/roster.repository", () => repository);

import { runRosterMutation } from "@/lib/operational-workspace/roster-action-runner";
import { submissionId } from "@/test/admin-fixtures";
import { teamAId } from "@/test/tournament-operational-fixtures";

const context = {
  kind: "organizer_workspace" as const,
  submissionId,
  tokenId: "da5096d0-eaca-4615-a2e4-602a564ec25e",
};

function newPlayerForm() {
  const form = new FormData();
  form.set("tournament_team_id", teamAId);
  form.set("display_name", "Ace");
  form.set("role", "player");
  return form;
}

describe("roster action runner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the safe duplicate-platform error without leaking database details", async () => {
    repository.executeCreatePlayerAndAddRpc.mockRejectedValue({
      code: "23505",
      message: "platform_id_conflict secret database detail",
    });
    const result = await runRosterMutation(
      "create_player",
      submissionId,
      context,
      newPlayerForm(),
    );
    expect(result.message).toContain("platform ID already belongs");
    expect(result.message).not.toContain("secret database detail");
  });

  it("sanitizes unknown database failures", async () => {
    repository.executeCreatePlayerAndAddRpc.mockRejectedValue(
      new Error("SUPABASE_SERVICE_ROLE_KEY postgres internals"),
    );
    const result = await runRosterMutation(
      "create_player",
      submissionId,
      context,
      newPlayerForm(),
    );
    expect(result.message).toBe(
      "We could not save this roster change. Please try again.",
    );
    expect(JSON.stringify(result)).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("passes the selected team boundary for membership updates", async () => {
    repository.executeUpdateMembershipRpc.mockResolvedValue({});
    const form = new FormData();
    form.set("tournament_team_id", teamAId);
    form.set("membership_id", "d72ca353-10d5-468a-aabb-81a239fbe78f");
    form.set("expected_updated_at", "2026-08-01T00:00:00Z");
    form.set("role", "player");
    await runRosterMutation("update_membership", submissionId, context, form);
    expect(repository.executeUpdateMembershipRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_payload: expect.objectContaining({ tournament_team_id: teamAId }),
      }),
    );
  });
});
