import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const repository = vi.hoisted(() => ({
  executeApplyImportRpc: vi.fn(),
  executeCancelImportRpc: vi.fn(),
  executeConfirmImportTimezoneRpc: vi.fn(),
  executeResolveImportConflictRpc: vi.fn(),
  recomputeImportReadinessRpc: vi.fn(),
  insertImportSession: vi.fn(),
  selectImportSession: vi.fn(),
  selectImportSnapshot: vi.fn(),
}));

vi.mock("./import.repository", () => repository);

import {
  applyTournamentImportSession,
  loadTournamentImportSession,
  TournamentImportError,
} from "./import.service";

const submissionId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const actorId = "33333333-3333-4333-8333-333333333333";
const context = {
  kind: "admin" as const,
  identity: { userId: actorId, email: "admin@example.test" },
};

const session = {
  id: sessionId,
  submission_id: submissionId,
  created_by_actor_type: "admin",
  created_by_actor_id: actorId,
  created_by_workspace_token_id: null,
  status: "ready",
  validation_summary: {},
};

const canonicalRow = {
  id: "44444444-4444-4444-8444-444444444444",
  session_id: sessionId,
  entity_type: "match",
  source_sheet: "QD1 Match info",
  source_row_number: 5,
  source_key: "match:series:fixture",
  source_references: [
    { sheet: "QD1 Match info", row: 5 },
    { sheet: "QD1 Match info", row: 6 },
    { sheet: "QD1 Match info", row: 7 },
  ],
  normalized_payload: {},
  validation_status: "warning",
  validation_errors: [],
  warnings: ["multiple_game_rows_for_series"],
  proposed_action: "skip",
  existing_entity_id: "55555555-5555-4555-8555-555555555555",
  resolution: { decision: "keep_existing" },
  resolution_status: "resolved",
};

beforeEach(() => {
  vi.clearAllMocks();
  repository.selectImportSession.mockResolvedValue({
    session,
    rows: [canonicalRow],
  });
  repository.selectImportSnapshot.mockResolvedValue({
    stages: [],
    teams: [],
    players: [],
    matches: [],
    rosters: [],
    groupAssignments: [],
    bracketLinks: [],
  });
});

describe("import apply readiness", () => {
  it("applies all 388 create rows after a resolved canonical conflict", async () => {
    repository.recomputeImportReadinessRpc.mockResolvedValue({
      ready: true,
      status: "ready",
      blocking_error_count: 0,
      unresolved_conflict_count: 0,
      blocker: null,
    });
    repository.executeApplyImportRpc.mockResolvedValue({
      success: true,
      created: 388,
      skipped: 4,
      failed_rows: 0,
    });

    await expect(
      applyTournamentImportSession(sessionId, submissionId, context),
    ).resolves.toEqual({
      success: true,
      created: 388,
      skipped: 4,
      failed_rows: 0,
    });
    expect(repository.recomputeImportReadinessRpc).toHaveBeenCalledBefore(
      repository.executeApplyImportRpc,
    );
  });

  it("preserves the persisted resolution after refresh", async () => {
    const loaded = await loadTournamentImportSession(
      sessionId,
      submissionId,
      context,
    );
    expect(loaded?.rows[0]).toMatchObject({
      resolution_status: "resolved",
      proposed_action: "skip",
      resolution: { decision: "keep_existing" },
    });
    expect(loaded?.rows[0].source_references).toHaveLength(3);
  });

  it("returns the exact remaining blocking row instead of a generic error", async () => {
    repository.recomputeImportReadinessRpc.mockResolvedValue({
      ready: false,
      status: "validation_failed",
      blocker: {
        entity_type: "match",
        source_sheet: "QD2 Match Info",
        source_row_number: 19,
      },
    });

    await expect(
      applyTournamentImportSession(sessionId, submissionId, context),
    ).rejects.toEqual(
      new TournamentImportError("import_blocking_row|match|QD2 Match Info|19"),
    );
    expect(repository.executeApplyImportRpc).not.toHaveBeenCalled();
  });

  it("preserves safe row diagnostics returned by atomic apply", async () => {
    repository.recomputeImportReadinessRpc.mockResolvedValue({ ready: true });
    repository.executeApplyImportRpc.mockRejectedValue(
      new Error(
        "import_apply_row|stage|LAN|1|create|stage_slug|import_database_function_missing",
      ),
    );
    await expect(
      applyTournamentImportSession(sessionId, submissionId, context),
    ).rejects.toMatchObject({
      code: "import_apply_row|stage|LAN|1|create|stage_slug|import_database_function_missing",
    });
  });
});
