import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration =
  fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802160000_add_tournament_table_import.sql",
    ),
    "utf8",
  ) +
  fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802173000_add_import_timezone_confirmation.sql",
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

  it("atomically confirms a session timezone only for null stage/match timezones", () => {
    expect(migration).toContain(
      "function public.confirm_tournament_import_timezone(",
    );
    expect(migration).toContain("timezone_confirmation_required boolean");
    expect(migration).toContain("timezone_confirmed_at=now()");
    expect(migration).toContain("entity_type in ('stage','match')");
    expect(migration).toContain(
      "when coalesce(r.normalized_payload->>'timezone','')=''",
    );
    expect(migration).toContain(
      "then jsonb_set(r.normalized_payload,'{timezone}',to_jsonb(p_timezone),true)",
    );
    expect(migration).toContain("else r.normalized_payload");
    expect(migration).toContain(
      "warning.value='timezone_fallback_confirmation_required'",
    );
    expect(migration).toContain("timezone_confirmation_required=false");
    expect(migration).toContain(
      "status=case when i.status='ready' then 'validation_failed'",
    );
    expect(migration).toContain("import_timezone_confirmed");
  });
});
