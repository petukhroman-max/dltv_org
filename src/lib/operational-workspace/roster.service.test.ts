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

import {
  createPlayerAndAddToRoster,
  listTeamRoster,
  RosterConflictError,
  searchPlayersForRoster,
  updateRosterMembership,
} from "@/lib/operational-workspace/roster.service";
import { submissionId } from "@/test/admin-fixtures";
import { playerId, teamAId } from "@/test/tournament-operational-fixtures";

const context = {
  kind: "organizer_workspace" as const,
  submissionId,
  tokenId: "da5096d0-eaca-4615-a2e4-602a564ec25e",
};
const member = {
  id: "d72ca353-10d5-468a-aabb-81a239fbe78f",
  tournament_team_id: teamAId,
  player_id: playerId,
  role: "player",
  is_captain: false,
  is_active: true,
  joined_at: "2026-08-01T00:00:00Z",
  left_at: null,
  updated_at: "2026-08-01T00:00:00Z",
  player: {
    id: playerId,
    display_name: "Ace",
    country_code: "DE",
    steam_id: "steam-1",
    deadlock_account_id: null,
    updated_at: "2026-08-01T00:00:00Z",
  },
};

describe("roster service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.executeCreatePlayerAndAddRpc.mockResolvedValue(member);
    repository.executeUpdateMembershipRpc.mockResolvedValue(member);
    repository.executePlayerSearchRpc.mockResolvedValue([member.player]);
    repository.executeListTeamRoster.mockResolvedValue([member]);
  });

  it("normalizes a new player server-side and passes only the trusted actor context", async () => {
    await createPlayerAndAddToRoster(
      {
        submissionId,
        values: {
          tournament_team_id: teamAId,
          role: "player",
          is_captain: false,
          new_player: { display_name: "  Ａce   [EU] " },
          confirm_same_name: false,
        },
      },
      context,
    );
    expect(repository.executeCreatePlayerAndAddRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_actor_type: "organizer_workspace",
        p_actor_id: null,
        p_workspace_token_id: context.tokenId,
        p_payload: expect.objectContaining({
          new_player: expect.objectContaining({ normalized_name: "ace [eu]" }),
        }),
      }),
    );
  });

  it("blocks cross-submission organizer access before repository calls", async () => {
    await expect(
      searchPlayersForRoster(
        "Ace",
        "79fc64c9-fe4f-486d-a959-1fe31d546ef0",
        context,
      ),
    ).rejects.toThrow("operational_access_denied");
    expect(repository.executePlayerSearchRpc).not.toHaveBeenCalled();
  });

  it("returns deterministic safe search and roster models without real_name", async () => {
    const [search, roster] = await Promise.all([
      searchPlayersForRoster("Ace", submissionId, context),
      listTeamRoster(submissionId, context),
    ]);
    expect(search[0]).not.toHaveProperty("real_name");
    expect(roster[0].player).not.toHaveProperty("real_name");
    expect(repository.executePlayerSearchRpc).toHaveBeenCalledWith(
      expect.objectContaining({ p_query: "Ace" }),
    );
  });

  it("maps stale membership updates to an explicit conflict", async () => {
    repository.executeUpdateMembershipRpc.mockRejectedValue({
      code: "40001",
      message: "operational_conflict",
    });
    await expect(
      updateRosterMembership(
        {
          submissionId,
          values: {
            membership_id: member.id,
            expected_updated_at: member.updated_at,
            role: "player",
            is_captain: false,
            is_active: true,
          },
        },
        context,
      ),
    ).rejects.toBeInstanceOf(RosterConflictError);
  });
});
