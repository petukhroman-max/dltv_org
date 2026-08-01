import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260802160000_add_tournament_table_import.sql",
  ),
  "utf8",
);

describe("tournament import migration contract", () => {
  it("stores only sessions and normalized rows behind RLS", () => {
    expect(migration).toContain(
      "create table public.tournament_import_sessions",
    );
    expect(migration).toContain("create table public.tournament_import_rows");
    expect(migration).toContain("normalized_payload jsonb");
    expect(migration).not.toMatch(
      /raw_workspace_token|raw_workbook|workbook_blob/i,
    );
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("from public,anon,authenticated");
  });

  it("guards the atomic apply RPC with access, ownership, ordering, rollback semantics and idempotency", () => {
    expect(migration).toContain(
      "function public.apply_tournament_import_session(",
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain("assert_operational_mutation_access");
    expect(migration).toContain("for update");
    expect(migration).toContain("import_session_already_completed");
    expect(migration).toContain("import_cross_submission_reference");
    expect(migration).toContain("import_completed_result_protected");
    expect(migration).toMatch(
      /when 'stage' then 1[\s\S]*when 'team' then 2[\s\S]*when 'player' then 3/,
    );
    expect(migration).not.toContain("exception when others");
  });

  it("audits safe metadata and removes temporary normalized rows on completion/cancel", () => {
    for (const event of [
      "import_started",
      "import_completed",
      "import_failed",
      "import_cancelled",
    ])
      expect(migration).toContain(event);
    expect(migration).toContain("fingerprint_prefix");
    expect(migration).toContain(
      "delete from public.tournament_import_rows where session_id=p_session_id",
    );
    expect(migration).not.toMatch(
      /jsonb_build_object\([^;]*(platformId|source_url_safe)/i,
    );
    expect(migration).not.toContain("p_raw_workspace_token");
  });
});
