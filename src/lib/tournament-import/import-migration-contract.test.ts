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
  ) +
  fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802190000_fix_import_conflict_resolution.sql",
    ),
    "utf8",
  ) +
  fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802203000_fix_import_apply_readiness.sql",
    ),
    "utf8",
  ) +
  fs.readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802220000_fix_atomic_import_apply_diagnostics.sql",
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
    expect(migration).toContain("source_references jsonb");
    expect(migration).toContain("jsonb_typeof(source_references)='array'");
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
    expect(migration).toMatch(
      /exception when others then[\s\S]*get stacked diagnostics[\s\S]*status='failed'/,
    );
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

  it("atomically resolves conflicts, updates counters and rejects stale writes", () => {
    expect(migration).toContain(
      "function public.resolve_tournament_import_conflict(",
    );
    expect(migration).toContain("resolution_status text");
    expect(migration).toContain("v_session.updated_at is distinct from");
    expect(migration).toContain("message='import_session_stale'");
    expect(migration).toMatch(
      /resolution_status='resolved'[\s\S]*proposed_action=v_target_action/,
    );
    expect(migration).toContain(
      "proposed_action='conflict' and resolution_status='unresolved'",
    );
    expect(migration).toContain("'conflict',v_unresolved");
    expect(migration).toContain("v_existing_id:=v_row.existing_entity_id");
    expect(migration).toContain(
      "message='import_resolution_existing_not_found'",
    );
    expect(migration).toContain("v_target_action:='skip'");
    expect(migration).toContain("v_row.resolution_status='resolved'");
    expect(migration).toContain("'idempotent',true");
    expect(migration).toContain(
      "import_completed_result_confirmation_required",
    );
    expect(migration).toContain("import_resolution_existing_rejected");
  });

  it("resolves every source row in a canonical group and recomputes apply readiness", () => {
    expect(migration).toContain(
      "function public.recompute_tournament_import_readiness(",
    );
    expect(migration).toContain(
      "jsonb_array_elements(candidate.source_references)",
    );
    expect(migration).toContain(
      "jsonb_array_elements(v_row.source_references)",
    );
    expect(migration).toContain("resolution_status='resolved'");
    expect(migration).toContain("validation_errors='[]'::jsonb");
    expect(migration).toContain("else 'skip' end");
    expect(migration).toContain("'canonical_group_rows',v_group_count");
    expect(migration).toContain("'blocking_error_count',v_blocking");
    expect(migration).toContain("'unresolved_conflict_count',v_unresolved");
    expect(migration).toContain("'ready',v_status='ready'");
    expect(migration).toContain("'entity_type',v_blocker.entity_type");
    expect(migration).toContain("'source_sheet',v_blocker.source_sheet");
    expect(migration).toContain(
      "'source_row_number',v_blocker.source_row_number",
    );
  });

  it("qualifies pgcrypto and reports the exact row after an atomic rollback", () => {
    expect(migration).toContain("extensions.digest(v_row.source_key,'sha256')");
    expect(migration).toContain("exception when others then");
    expect(migration).toContain("get stacked diagnostics");
    expect(migration).toContain("v_sqlstate=returned_sqlstate");
    expect(migration).toContain("'entity_type',v_row.entity_type");
    expect(migration).toContain("'source_sheet',v_row.source_sheet");
    expect(migration).toContain("'source_row_number',v_row.source_row_number");
    expect(migration).toContain("'import_step',v_step");
    expect(migration).toContain("'batch_index',v_batch_index");
    expect(migration).toContain("when v_sqlstate='42883'");
    expect(migration).toContain("then 'import_database_function_missing'");
    expect(migration).toContain(
      "when v_row.entity_type in ('player','roster_member') then '[redacted]'",
    );
    expect(migration).toMatch(
      /exception when others then[\s\S]*status='failed'[\s\S]*return jsonb_build_object\('success',false/,
    );
  });

  it("keeps apply ordering, retries and double apply idempotent", () => {
    expect(migration).toMatch(
      /when 'stage' then 1[\s\S]*when 'team' then 2[\s\S]*when 'player' then 3[\s\S]*when 'roster_member' then 4[\s\S]*when 'match' then 5[\s\S]*when 'standings_group_assignment' then 6[\s\S]*when 'bracket_link' then 8/,
    );
    expect(migration).toContain("if v_session.status='completed' then");
    expect(migration).toContain("'idempotent',true");
    expect(migration).toContain("'success',true,'idempotent',false");
    expect(migration).toContain(
      "v_session.status in ('applying','completed','cancelled','expired')",
    );
  });
});
