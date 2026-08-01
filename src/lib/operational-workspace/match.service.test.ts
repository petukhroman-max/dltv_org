import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  completeTournamentMatch,
  createTournamentMatch,
  deleteTournamentMatch,
  listTournamentMatches,
  MatchApplicationError,
  reopenTournamentMatch,
  updateTournamentMatch,
} from "@/lib/operational-workspace/match.service";
import { makeMatch } from "@/test/tournament-operational-fixtures";
import { submissionId } from "@/test/admin-fixtures";

const matchId = "a360741a-9af4-44b3-9a1b-4781a0bc190c";
const teamA = "1d5ecfe8-175f-46a1-859d-8f695d29eb68";
const teamB = "68ab47f8-43eb-43a7-a78f-e2c2c6bf0f71";
const version = "2026-08-01T00:00:00.000Z";
const context = {
  kind: "organizer_workspace" as const,
  submissionId,
  tokenId: "10000000-0000-4000-8000-000000000001",
};

function dependencies(match = makeMatch()) {
  return {
    list: vi.fn(async () => [match]),
    get: vi.fn(async () => match),
    create: vi.fn(async (args: unknown) => {
      void args;
      return {
        id: matchId,
        submission_id: submissionId,
        status: "draft",
        updated_at: version,
      };
    }),
    update: vi.fn(),
    status: vi.fn(),
    complete: vi.fn(async (args: unknown) => {
      void args;
      return {
        id: matchId,
        submission_id: submissionId,
        status: "completed",
        updated_at: version,
      };
    }),
    cancel: vi.fn(),
    reopen: vi.fn(async (args: unknown) => {
      void args;
      return {
        id: matchId,
        submission_id: submissionId,
        status: "live",
        updated_at: version,
      };
    }),
    remove: vi.fn(async (args: unknown) => {
      void args;
      return {
        id: matchId,
        submission_id: submissionId,
        deleted: true,
      };
    }),
  };
}

describe("match service", () => {
  it("keeps source and submission scope out of the browser payload", async () => {
    const deps = dependencies();
    await createTournamentMatch(
      {
        submissionId,
        values: {
          stage_id: null,
          match_number: null,
          round_name: null,
          group_name: null,
          scheduled_at: null,
          timezone: "UTC",
          best_of: null,
          team_a_id: null,
          team_b_id: null,
          stream_url: null,
          is_public: false,
          status: "draft",
        },
      },
      context,
      deps as never,
    );
    const args = deps.create.mock.calls[0][0] as Record<string, unknown>;
    expect(args.p_submission_id).toBe(submissionId);
    expect(args.p_workspace_token_id).toBe(context.tokenId);
    expect(args.p_payload).not.toHaveProperty("source");
    expect(args.p_payload).not.toHaveProperty("timezone");
  });

  it.each([
    {
      label: "same-submission teams",
      teamA,
      teamB,
    },
    {
      label: "one TBD team",
      teamA,
      teamB: null,
    },
  ])("accepts a scheduled match with $label", async ({ teamA, teamB }) => {
    const deps = dependencies();
    await createTournamentMatch(
      {
        submissionId,
        values: {
          stage_id: "00000000-0000-4000-8000-000000000003",
          match_number: 1,
          round_name: "Round 1",
          group_name: null,
          scheduled_at: "2026-08-10T12:00:00.000Z",
          timezone: "UTC",
          best_of: 3,
          team_a_id: teamA,
          team_b_id: teamB,
          stream_url: null,
          is_public: true,
          status: "scheduled",
        },
      },
      context,
      deps as never,
    );
    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_payload: expect.objectContaining({
          team_a_id: teamA,
          team_b_id: teamB,
          status: "scheduled",
        }),
      }),
    );
  });

  it("creates a match with trusted admin identity", async () => {
    const deps = dependencies();
    await createTournamentMatch(
      {
        submissionId,
        values: {
          stage_id: null,
          match_number: null,
          round_name: null,
          group_name: null,
          scheduled_at: null,
          timezone: "UTC",
          best_of: null,
          team_a_id: null,
          team_b_id: null,
          stream_url: null,
          is_public: false,
          status: "draft",
        },
      },
      {
        kind: "admin",
        identity: {
          userId: "1ada7551-3958-41c6-9da4-47ca541e9fca",
          email: "admin@example.com",
        },
      },
      deps as never,
    );
    expect(deps.create).toHaveBeenCalledWith(
      expect.objectContaining({
        p_submission_id: submissionId,
        p_actor_type: "admin",
        p_actor_id: "1ada7551-3958-41c6-9da4-47ca541e9fca",
        p_workspace_token_id: null,
      }),
    );
  });

  it("derives winner in the RPC and never accepts it from the browser", async () => {
    const deps = dependencies(
      makeMatch({ status: "live", team_a_id: teamA, team_b_id: teamB }),
    );
    await completeTournamentMatch(
      {
        submissionId,
        values: {
          id: matchId,
          expected_updated_at: version,
          team_a_id: teamA,
          team_b_id: teamB,
          score_a: 2,
          score_b: 1,
          deadlock_match_id: null,
          duration_seconds: null,
          vod_url: null,
        },
      },
      context,
      deps as never,
    );
    const args = deps.complete.mock.calls[0][0] as Record<string, unknown>;
    expect(args.p_payload).not.toHaveProperty("winner_team_id");
  });

  it("rejects cross-submission organizer context before repository access", async () => {
    const deps = dependencies();
    await expect(
      listTournamentMatches(
        submissionId,
        { ...context, submissionId: "20000000-0000-4000-8000-000000000002" },
        {},
        deps as never,
      ),
    ).rejects.toMatchObject({ code: "MATCH_ACCESS_DENIED" });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it("filters schedule dates in the match timezone instead of UTC", async () => {
    const deps = dependencies(
      makeMatch({
        scheduled_at: "2026-08-10T23:30:00Z",
        timezone: "Europe/Berlin",
      }),
    );
    const matches = await listTournamentMatches(
      submissionId,
      context,
      { date: "2026-08-11" },
      deps as never,
    );
    expect(matches).toHaveLength(1);
  });

  it("does not allow an edit to invalidate a scheduled match", async () => {
    const deps = dependencies();
    await expect(
      updateTournamentMatch(
        {
          submissionId,
          values: {
            id: matchId,
            expected_updated_at: version,
            stage_id: null,
            match_number: 1,
            round_name: "Round 1",
            group_name: null,
            scheduled_at: null,
            timezone: "UTC",
            best_of: null,
            team_a_id: teamA,
            team_b_id: teamB,
            stream_url: null,
            vod_url: null,
            deadlock_match_id: null,
            duration_seconds: null,
            is_public: true,
          },
        },
        context,
        deps as never,
      ),
    ).rejects.toMatchObject({ fieldErrors: { status: expect.any(String) } });
    expect(deps.update).not.toHaveBeenCalled();
  });

  it("requires explicit reopen and validates its target", async () => {
    const deps = dependencies(makeMatch({ status: "completed" }));
    await expect(
      reopenTournamentMatch(
        {
          submissionId,
          values: {
            id: matchId,
            expected_updated_at: version,
            target_status: "scheduled",
          },
        },
        context,
        deps as never,
      ),
    ).rejects.toMatchObject({ code: "MATCH_TRANSITION_INVALID" });
  });

  it("maps optimistic conflicts and protected deletes to stable codes", async () => {
    const stale = dependencies();
    stale.remove.mockRejectedValue({ code: "40001", message: "details" });
    await expect(
      deleteTournamentMatch(
        { submissionId, values: { id: matchId, expected_updated_at: version } },
        context,
        stale as never,
      ),
    ).rejects.toMatchObject({ code: "MATCH_STALE_UPDATE" });

    const protectedMatch = dependencies(makeMatch({ status: "completed" }));
    protectedMatch.remove.mockRejectedValue({
      code: "23503",
      message: "match_delete_has_history",
    });
    await expect(
      deleteTournamentMatch(
        { submissionId, values: { id: matchId, expected_updated_at: version } },
        context,
        protectedMatch as never,
      ),
    ).rejects.toBeInstanceOf(MatchApplicationError);
    await expect(
      deleteTournamentMatch(
        { submissionId, values: { id: matchId, expected_updated_at: version } },
        context,
        protectedMatch as never,
      ),
    ).rejects.toMatchObject({ code: "MATCH_DELETE_HAS_HISTORY" });
  });

  it("does not misreport an audit CHECK violation as cross-submission scope", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const deps = dependencies();
    deps.create.mockRejectedValue({
      code: "23514",
      message:
        'new row violates check constraint "submission_events_to_status_allowed" secret-detail',
    });

    await expect(
      createTournamentMatch(
        {
          submissionId,
          values: {
            stage_id: null,
            match_number: null,
            round_name: null,
            group_name: null,
            scheduled_at: null,
            timezone: "UTC",
            best_of: null,
            team_a_id: null,
            team_b_id: null,
            stream_url: null,
            is_public: false,
            status: "draft",
          },
        },
        context,
        deps as never,
      ),
    ).rejects.toMatchObject({ code: "MATCH_MUTATION_FAILED" });
    expect(consoleError).toHaveBeenCalledWith(
      "operational_mutation_failed",
      expect.objectContaining({
        operation: "create_tournament_match",
        submissionId,
        databaseCode: "23514",
        stableCode: "MATCH_MUTATION_FAILED",
      }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "secret-detail",
    );
    consoleError.mockRestore();
  });

  it.each(["stage", "team_a", "team_b", "winner"])(
    "keeps explicit cross-submission %s errors mapped to scope",
    async (entity) => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const deps = dependencies();
      deps.create.mockRejectedValue({
        code: "23514",
        message: `${entity} must belong to the same tournament submission`,
      });

      await expect(
        createTournamentMatch(
          {
            submissionId,
            values: {
              stage_id: null,
              match_number: null,
              round_name: null,
              group_name: null,
              scheduled_at: null,
              timezone: "UTC",
              best_of: null,
              team_a_id: null,
              team_b_id: null,
              stream_url: null,
              is_public: false,
              status: "draft",
            },
          },
          context,
          deps as never,
        ),
      ).rejects.toMatchObject({ code: "MATCH_SCOPE_INVALID" });
      consoleError.mockRestore();
    },
  );
});
