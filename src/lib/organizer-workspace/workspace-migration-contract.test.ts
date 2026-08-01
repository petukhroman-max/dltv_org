import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const directory = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(directory).filter((name) =>
  name.endsWith("_add_organizer_workspace_stages_teams.sql"),
);
const sql = migrations[0]
  ? readFileSync(join(directory, migrations[0]), "utf8")
  : "";

describe("organizer workspace migration contract", () => {
  it("adds one timestamped migration without recreating operational tables", () => {
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toMatch(/^\d{14}_/);
    for (const table of [
      "tournament_stages",
      "tournament_teams",
      "players",
      "tournament_roster_members",
      "tournament_matches",
    ]) {
      expect(sql).not.toContain(`create table public.${table}`);
    }
    expect(sql).not.toMatch(/\bdrop\s+(?:table|function)\b/i);
  });

  it("creates a private hash-only workspace token table", () => {
    expect(sql).toContain("create table public.organizer_workspace_tokens");
    expect(sql).toContain("token_hash text not null unique");
    expect(sql).toContain("references public.admin_users(user_id)");
    expect(sql).toContain("organizer_workspace_tokens_one_active_idx");
    expect(sql).toContain("where revoked_at is null");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("from public, anon, authenticated");
    expect(sql).toContain(
      "grant all on table public.organizer_workspace_tokens to service_role",
    );
    expect(sql).not.toMatch(/\braw_token\b/i);
  });

  it("rotates, expires and revokes workspace links with safe audit metadata", () => {
    expect(sql).toContain("create_organizer_workspace_token");
    expect(sql).toContain("revoke_organizer_workspace_token");
    expect(sql).toContain("validate_organizer_workspace_access");
    expect(sql).toContain("workspace_link_created");
    expect(sql).toContain("workspace_link_rotated");
    expect(sql).toContain("workspace_link_revoked");
    expect(sql).toContain("'token_version', 'v1'");
    expect(sql).toContain("'delivery_method', 'manual'");
    expect(sql).toContain("expires_at > now()");
    expect(sql).toContain("for update");
    expect(sql).toContain("set last_used_at = now()");
  });

  it.each([
    "create_tournament_stage",
    "update_tournament_stage",
    "delete_tournament_stage",
    "create_tournament_team",
    "update_tournament_team",
    "delete_tournament_team",
  ])("defines private service-role RPC %s", (rpc) => {
    expect(sql).toContain(`function public.${rpc}`);
    expect(sql).toContain(`grant execute on function public.${rpc}`);
  });

  it("enforces server-derived actor authorization and submission scope", () => {
    expect(sql).toContain("assert_operational_mutation_access");
    expect(sql).toContain("p_actor_type = 'admin'");
    expect(sql).toContain("p_actor_type = 'organizer_workspace'");
    expect(sql).toContain("and submission_id = p_submission_id");
    expect(sql).toContain("and revoked_at is null");
    expect(sql).toContain("and expires_at > now()");
    expect(sql).toContain("status not in (");
  });

  it("enforces optimistic concurrency, scoped ownership and safe deletion", () => {
    expect(sql.match(/updated_at = p_expected_updated_at/g)).toHaveLength(4);
    expect(sql.match(/errcode = '40001'/g)).toHaveLength(4);
    expect(sql).toContain("stage_has_dependencies");
    expect(sql).toContain("team_has_dependencies");
    expect(sql).toContain("from public.tournament_roster_members");
    expect(sql).toContain("from public.tournament_matches");
  });

  it("creates allowlisted audit events without browser metadata", () => {
    for (const event of [
      "stage_created",
      "stage_updated",
      "stage_deleted",
      "team_created",
      "team_updated",
      "team_deleted",
    ]) {
      expect(sql).toContain(`'${event}'`);
    }
    expect(sql).toContain("'operational_version', 'v1'");
    expect(sql).toContain("'access_method', 'workspace_link'");
    expect(sql).toContain("'changed_fields', v_changed");
    expect(sql).not.toContain("p_event_type");
    expect(sql).not.toContain("p_metadata");
  });

  it("preserves slugs on rename and blocks exact duplicate team names", () => {
    const stageUpdate = sql.slice(
      sql.indexOf("function public.update_tournament_stage"),
      sql.indexOf("function public.delete_tournament_stage"),
    );
    const teamUpdate = sql.slice(
      sql.indexOf("function public.update_tournament_team"),
      sql.indexOf("function public.delete_tournament_team"),
    );
    expect(stageUpdate).not.toMatch(/\n\s*slug\s*=/);
    expect(teamUpdate).not.toMatch(/\n\s*slug\s*=/);
    expect(sql).toContain("lower(name) = lower(btrim(p_payload ->> 'name'))");
    expect(sql).toContain("pg_advisory_xact_lock");
  });
});
