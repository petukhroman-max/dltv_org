import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ rpc }),
}));

import { executeApplyImportRpc } from "./import.repository";

const access = {
  p_actor_type: "admin" as const,
  p_actor_id: "33333333-3333-4333-8333-333333333333",
  p_workspace_token_id: null,
};

describe("atomic import repository diagnostics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs only safe row metadata and surfaces a stable UI code", async () => {
    rpc.mockResolvedValue({
      error: null,
      data: {
        success: false,
        failure: {
          failure_code: "import_database_function_missing",
          database_code: "42883",
          constraint_name: null,
          function_name: "apply_tournament_import_session",
          entity_type: "stage",
          source_sheet: "LAN",
          source_row_number: 1,
          source_key: "stage:lan",
          proposed_action: "create",
          import_step: "stage_slug",
          batch_index: 1,
        },
      },
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      executeApplyImportRpc(
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
        access,
      ),
    ).rejects.toThrow(
      "import_apply_row|stage|LAN|1|create|stage_slug|import_database_function_missing",
    );
    expect(log).toHaveBeenCalledWith(
      "tournament_import_apply_failed",
      expect.objectContaining({
        entity_type: "stage",
        source_sheet: "LAN",
        source_row_number: "1",
        source_key: "stage:lan",
        database_code: "42883",
        batch_index: "1",
      }),
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
