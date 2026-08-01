import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260801190000_add_tournament_match_management.sql",
  ),
  "utf8",
);

const rpcNames = [
  "create_tournament_match",
  "update_tournament_match",
  "update_tournament_match_status",
  "complete_tournament_match",
  "cancel_tournament_match",
  "reopen_tournament_match",
  "delete_tournament_match",
];

describe("match management migration contract", () => {
  it("extends the existing table with only missing constraints and indexes", () => {
    expect(migration).not.toMatch(/create table public\.tournament_matches/i);
    expect(migration).toContain("tournament_matches_scheduled_required_fields");
    expect(migration).toContain("tournament_matches_live_stage_required");
    expect(migration).toContain(
      "tournament_matches_submission_deadlock_match_id_key",
    );
  });

  it("pins SECURITY DEFINER search paths and restricts every mutation RPC", () => {
    for (const name of rpcNames) {
      const start = migration.indexOf(`function public.${name}(`);
      expect(start).toBeGreaterThan(-1);
      const body = migration.slice(start, start + 1100);
      expect(body).toContain("security definer");
      expect(body).toContain("set search_path = pg_catalog, public");
      expect(migration).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}\\([\\s\\S]*?from public, anon, authenticated;`,
        ),
      );
      expect(migration).toMatch(
        new RegExp(
          `grant execute on function public\\.${name}\\([\\s\\S]*?to service_role;`,
        ),
      );
    }
  });

  it("uses trusted access context, concurrency locks, strict payloads, and audit events", () => {
    expect(migration).toContain("assert_operational_mutation_access");
    expect(migration).not.toContain("p_raw_token");
    expect(migration).toContain("p_expected_updated_at");
    expect(migration).toContain("match_stale_update");
    expect(migration).toContain("p_payload - array[");
    for (const event of [
      "match_created",
      "match_updated",
      "match_status_changed",
      "match_completed",
      "match_cancelled",
      "match_reopened",
      "match_deleted",
    ]) {
      expect(migration).toContain(event);
    }
  });

  it("enforces transitions, winner derivation, protected deletion, and source ownership", () => {
    expect(migration).toContain("match_transition_allowed");
    expect(migration).toContain("then v_old.team_a_id else v_old.team_b_id");
    expect(migration).toContain("match_delete_has_history");
    expect(migration).toContain("'manual'");
    expect(migration).not.toMatch(/p_payload\s*->>\s*'source'/);
  });
});
