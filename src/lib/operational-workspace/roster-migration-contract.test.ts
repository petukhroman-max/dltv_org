import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260801180000_add_players_roster_management.sql",
  ),
  "utf8",
).replaceAll("\r\n", "\n");

describe("players and roster migration contract", () => {
  it("adds only missing constraints and RPCs without recreating operational tables", () => {
    expect(sql).not.toMatch(
      /create table public\.(players|tournament_roster_members)/i,
    );
    expect(sql).toContain("tournament_roster_captain_role_check");
    expect(sql).toContain("tournament_roster_one_active_captain_idx");
  });

  it.each([
    "create_player_and_add_to_roster",
    "add_existing_player_to_roster",
    "update_player_profile",
    "update_roster_membership",
    "remove_roster_member",
    "restore_roster_member",
    "search_players_for_roster",
  ])("defines and restricts %s", (name) => {
    expect(sql).toMatch(new RegExp(`function public\\.${name}\\(`));
    expect(sql).toMatch(
      new RegExp(`revoke all on function public\\.${name}\\(`),
    );
    expect(sql).toMatch(
      new RegExp(
        `grant execute on function public\\.${name}\\([^;]+service_role`,
        "s",
      ),
    );
  });

  it("pins search paths, has no dynamic SQL, and never emits real_name", () => {
    expect(
      (sql.match(/security definer/g) ?? []).length,
    ).toBeGreaterThanOrEqual(8);
    expect((sql.match(/set search_path/g) ?? []).length).toBeGreaterThanOrEqual(
      8,
    );
    expect(sql).not.toMatch(
      /execute\s+format|p_event_type|p_metadata|p_actor_metadata/i,
    );
    expect(sql).not.toContain("real_name");
  });

  it("checks ownership, optimistic concurrency, soft removal and audit events", () => {
    expect(sql).toContain("t.submission_id=p_submission_id");
    expect(sql).toContain("expected_updated_at");
    expect(sql).toContain("is_active=false,is_captain=false,left_at=now()");
    for (const event of [
      "player_created",
      "player_profile_updated",
      "roster_member_added",
      "roster_member_updated",
      "roster_member_removed",
      "roster_member_restored",
      "roster_captain_changed",
    ]) {
      expect(sql).toContain(`'${event}'`);
    }
    const auditStart = sql.indexOf("'player_profile_updated'");
    const auditEnd = sql.indexOf("return jsonb_build_object", auditStart);
    const profileAudit = sql.slice(auditStart, auditEnd);
    expect(auditStart).toBeGreaterThan(-1);
    expect(auditEnd).toBeGreaterThan(auditStart);
    expect(profileAudit).not.toContain("'steam_id'");
    expect(profileAudit).not.toContain("'deadlock_account_id'");
  });
});
