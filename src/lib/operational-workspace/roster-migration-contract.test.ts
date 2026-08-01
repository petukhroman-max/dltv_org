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
const baseSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260801050000_add_tournament_operational_data_model.sql",
  ),
  "utf8",
).replaceAll("\r\n", "\n");
const workspaceSql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260801143000_add_organizer_workspace_stages_teams.sql",
  ),
  "utf8",
).replaceAll("\r\n", "\n");
const repository = readFileSync(
  join(process.cwd(), "src/lib/operational-workspace/roster.repository.ts"),
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

  it("preserves partial unique platform indexes and historical team deletion protection", () => {
    expect(baseSql).toMatch(
      /unique index players_steam_id_key[\s\S]*where steam_id is not null/,
    );
    expect(baseSql).toMatch(
      /unique index players_deadlock_account_id_key[\s\S]*where deadlock_account_id is not null/,
    );
    expect(workspaceSql).toMatch(
      /from public\.tournament_roster_members[\s\S]*team_has_dependencies/,
    );
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
    expect(sql).toContain(
      "m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid",
    );
    expect(sql).toContain(
      "pg_advisory_xact_lock(hashtextextended(v_old.tournament_team_id::text, 22))",
    );
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

  it("keeps combined creation and its audit writes in one RPC transaction", () => {
    const start = sql.indexOf(
      "function public.create_player_and_add_to_roster",
    );
    const end = sql.indexOf(
      "function public.add_existing_player_to_roster",
      start,
    );
    const combinedRpc = sql.slice(start, end);
    expect(combinedRpc).toContain("insert into public.players");
    expect(combinedRpc).toContain(
      "insert into public.tournament_roster_members",
    );
    expect(combinedRpc).toContain("insert into public.submission_events");
    expect(combinedRpc).not.toMatch(/\bcommit\b/i);
  });

  it("implements remove and restore lifecycle without automatic captain restore", () => {
    const updateStart = sql.indexOf("function public.update_roster_membership");
    const updateEnd = sql.indexOf(
      "function public.remove_roster_member",
      updateStart,
    );
    const updateRpc = sql.slice(updateStart, updateEnd);
    expect(updateRpc).not.toContain("'is_active']::text[]");
    expect(updateRpc).not.toMatch(/set[^;]*is_active=/);
    expect(sql).toContain("set is_active=false,is_captain=false,left_at=now()");
    expect(sql).toContain(
      "set is_active=true,is_captain=false,left_at=null,role=p_payload->>'role'",
    );
    expect(sql).toContain(
      "m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid and m.is_active",
    );
    expect(sql).toContain(
      "m.tournament_team_id=(p_payload->>'tournament_team_id')::uuid and not m.is_active",
    );
  });

  it("keeps TypeScript RPC names and argument contracts aligned with SQL", () => {
    for (const name of [
      "create_player_and_add_to_roster",
      "add_existing_player_to_roster",
      "update_player_profile",
      "update_roster_membership",
      "remove_roster_member",
      "restore_roster_member",
      "search_players_for_roster",
    ]) {
      expect(repository).toContain(`"${name}"`);
      expect(sql).toContain(`function public.${name}(`);
    }
    for (const argument of [
      "p_submission_id",
      "p_actor_type",
      "p_actor_id",
      "p_workspace_token_id",
    ]) {
      expect(repository).toContain(argument);
      expect(sql).toContain(argument);
    }
    expect(repository).toContain("p_payload");
    expect(repository).toContain("p_query");
  });
});
