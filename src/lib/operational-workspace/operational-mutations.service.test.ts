import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createTournamentStage,
  createTournamentTeam,
  deleteTournamentStage,
  deleteTournamentTeam,
  OperationalAuthorizationError,
  OperationalConflictError,
  OperationalDependencyError,
  OperationalValidationError,
  updateTournamentStage,
  updateTournamentTeam,
} from "@/lib/operational-workspace/operational-mutations.service";
import { submissionId } from "@/test/admin-fixtures";
import { stageId, teamAId } from "@/test/tournament-operational-fixtures";

const adminContext = {
  kind: "admin" as const,
  identity: {
    userId: "1ada7551-3958-41c6-9da4-47ca541e9fca",
    email: "admin@example.com",
  },
};
const workspaceContext = {
  kind: "organizer_workspace" as const,
  submissionId,
  tokenId: "da5096d0-eaca-4615-a2e4-602a564ec25e",
};
const stageValues = {
  name: "Online Qualifier",
  stage_type: "qualifier",
  sequence_number: 1,
  start_at: "2026-08-10T10:00:00+02:00",
  end_at: "2026-08-10T18:00:00+02:00",
  timezone: "Europe/Berlin",
  format_text: "Swiss",
  best_of_default: 3,
  team_count: 16,
  is_online: true,
  location_name: null,
  status: "scheduled",
  is_public: true,
};
const teamValues = {
  name: "Team Alpha",
  short_name: "ALPHA",
  logo_url: "https://example.com/logo.png",
  region: "EU",
  seed: 1,
  status: "active",
  external_team_id: null,
  is_public: true,
};

function dependencies() {
  return {
    createStage: vi.fn().mockResolvedValue({
      id: stageId,
      submission_id: submissionId,
      name: stageValues.name,
      slug: "online-qualifier",
      updated_at: "2026-08-01T00:00:00Z",
    }),
    updateStage: vi.fn().mockResolvedValue({
      id: stageId,
      submission_id: submissionId,
      name: stageValues.name,
      slug: "preserved",
      updated_at: "2026-08-02T00:00:00Z",
    }),
    deleteStage: vi.fn().mockResolvedValue({
      id: stageId,
      submission_id: submissionId,
      name: stageValues.name,
      deleted: true,
    }),
    createTeam: vi.fn().mockResolvedValue({
      id: teamAId,
      submission_id: submissionId,
      name: teamValues.name,
      slug: "team-alpha-2",
      updated_at: "2026-08-01T00:00:00Z",
    }),
    updateTeam: vi.fn().mockResolvedValue({
      id: teamAId,
      submission_id: submissionId,
      name: teamValues.name,
      slug: "preserved",
      updated_at: "2026-08-02T00:00:00Z",
    }),
    deleteTeam: vi.fn().mockResolvedValue({
      id: teamAId,
      submission_id: submissionId,
      name: teamValues.name,
      deleted: true,
    }),
    stageSlugs: vi.fn().mockResolvedValue(["online-qualifier"]),
    teamSlugs: vi.fn().mockResolvedValue(["team-alpha"]),
  };
}

describe("operational mutation service", () => {
  it("creates stages for organizer access with a scoped slug suffix", async () => {
    const deps = dependencies();
    await createTournamentStage(
      { submissionId, values: stageValues },
      workspaceContext,
      deps,
    );
    expect(deps.createStage).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_actor_type: "organizer_workspace",
        p_actor_id: null,
        p_workspace_token_id: workspaceContext.tokenId,
        p_payload: expect.objectContaining({ slug: "online-qualifier-2" }),
      }),
    );
  });

  it("updates stages without accepting or regenerating a slug", async () => {
    const deps = dependencies();
    await updateTournamentStage(
      {
        submissionId,
        values: {
          ...stageValues,
          id: stageId,
          expected_updated_at: "2026-08-01T00:00:00Z",
        },
      },
      adminContext,
      deps,
    );
    expect(deps.updateStage.mock.calls[0][0].p_payload).not.toHaveProperty(
      "slug",
    );
    expect(deps.updateStage).toHaveBeenCalledWith(
      expect.objectContaining({
        p_actor_type: "admin",
        p_actor_id: adminContext.identity.userId,
      }),
    );
  });

  it("creates and updates teams with manual source and preserved slug", async () => {
    const deps = dependencies();
    await createTournamentTeam(
      { submissionId, values: teamValues },
      adminContext,
      deps,
    );
    expect(deps.createTeam.mock.calls[0][0].p_payload).toMatchObject({
      slug: "team-alpha-2",
      source: "manual",
    });
    await updateTournamentTeam(
      {
        submissionId,
        values: {
          ...teamValues,
          id: teamAId,
          expected_updated_at: "2026-08-01T00:00:00Z",
        },
      },
      workspaceContext,
      deps,
    );
    expect(deps.updateTeam.mock.calls[0][0].p_payload).not.toHaveProperty(
      "slug",
    );
  });

  it("deletes unused stages and teams through the same actor contract", async () => {
    const deps = dependencies();
    await deleteTournamentStage(
      {
        submissionId,
        values: {
          id: stageId,
          expected_updated_at: "2026-08-01T00:00:00Z",
        },
      },
      adminContext,
      deps,
    );
    await deleteTournamentTeam(
      {
        submissionId,
        values: {
          id: teamAId,
          expected_updated_at: "2026-08-01T00:00:00Z",
        },
      },
      workspaceContext,
      deps,
    );
    expect(deps.deleteStage).toHaveBeenCalled();
    expect(deps.deleteTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        p_workspace_token_id: workspaceContext.tokenId,
      }),
    );
  });

  it("blocks cross-submission organizer mutations before the RPC", async () => {
    const deps = dependencies();
    await expect(
      createTournamentTeam(
        {
          submissionId: "79fc64c9-fe4f-486d-a959-1fe31d546ef0",
          values: teamValues,
        },
        workspaceContext,
        deps,
      ),
    ).rejects.toBeInstanceOf(OperationalAuthorizationError);
    expect(deps.createTeam).not.toHaveBeenCalled();
  });

  it("maps stale updates, dependencies, duplicate sequence and duplicate team names", async () => {
    const stale = dependencies();
    stale.updateStage.mockRejectedValue({
      code: "40001",
      message: "operational_conflict",
    });
    await expect(
      updateTournamentStage(
        {
          submissionId,
          values: {
            ...stageValues,
            id: stageId,
            expected_updated_at: "2026-08-01T00:00:00Z",
          },
        },
        adminContext,
        stale,
      ),
    ).rejects.toBeInstanceOf(OperationalConflictError);
    const blocked = dependencies();
    blocked.deleteStage.mockRejectedValue({
      code: "23503",
      message: "stage_has_dependencies",
    });
    await expect(
      deleteTournamentStage(
        {
          submissionId,
          values: { id: stageId, expected_updated_at: "2026-08-01T00:00:00Z" },
        },
        adminContext,
        blocked,
      ),
    ).rejects.toBeInstanceOf(OperationalDependencyError);
    const duplicateStage = dependencies();
    duplicateStage.createStage.mockRejectedValue({
      code: "23505",
      message: "stage_sequence_conflict",
    });
    await expect(
      createTournamentStage(
        { submissionId, values: stageValues },
        adminContext,
        duplicateStage,
      ),
    ).rejects.toMatchObject({
      fieldErrors: { sequence_number: "A stage already uses this position." },
    });
    const duplicateTeam = dependencies();
    duplicateTeam.createTeam.mockRejectedValue({
      code: "23505",
      message: "team_name_conflict",
    });
    await expect(
      createTournamentTeam(
        { submissionId, values: teamValues },
        adminContext,
        duplicateTeam,
      ),
    ).rejects.toMatchObject({
      fieldErrors: {
        name: "A team with this name already exists in the tournament.",
      },
    });
  });

  it("rejects invalid dates, timezone, even BO, logo URL and seed", async () => {
    const deps = dependencies();
    await expect(
      createTournamentStage(
        {
          submissionId,
          values: {
            ...stageValues,
            timezone: "Mars/Olympus",
            best_of_default: 2,
          },
        },
        adminContext,
        deps,
      ),
    ).rejects.toBeInstanceOf(OperationalValidationError);
    await expect(
      createTournamentTeam(
        {
          submissionId,
          values: { ...teamValues, logo_url: "javascript:alert(1)", seed: -1 },
        },
        adminContext,
        deps,
      ),
    ).rejects.toBeInstanceOf(OperationalValidationError);
  });
});
