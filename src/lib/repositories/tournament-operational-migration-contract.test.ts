import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationDirectory = join(process.cwd(), "supabase", "migrations");
const migrationName = readdirSync(migrationDirectory).find((name) =>
  name.endsWith("_add_tournament_operational_data_model.sql"),
);
const sql = migrationName
  ? readFileSync(join(migrationDirectory, migrationName), "utf8")
  : "";

describe("tournament operational migration contract", () => {
  it("adds exactly one timestamped operational migration", () => {
    expect(migrationName).toMatch(/^\d{14}_/);
    expect(
      readdirSync(migrationDirectory).filter((name) =>
        name.includes("tournament_operational_data_model"),
      ),
    ).toHaveLength(1);
  });

  it.each([
    "tournament_stages",
    "tournament_teams",
    "players",
    "tournament_roster_members",
    "tournament_matches",
  ])("creates private-by-default table %s", (table) => {
    expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain(
      `alter table public.${table} enable row level security`,
    );
    expect(sql).toContain(
      `revoke all on table public.${table} from public, anon, authenticated`,
    );
    expect(sql).toContain(`grant all on table public.${table} to service_role`);
  });

  it("enforces scoped slugs and cross-tournament match references", () => {
    expect(sql).toContain("tournament_stages_submission_slug_key");
    expect(sql).toContain("tournament_teams_submission_slug_key");
    expect(sql).toContain("validate_tournament_match_scope");
    expect(sql).toContain("prevent_operational_scope_change");
    expect(sql).toContain(
      "stage must belong to the same tournament submission",
    );
    expect(sql).toContain(
      "team_a must belong to the same tournament submission",
    );
    expect(sql).toContain(
      "team_b must belong to the same tournament submission",
    );
    expect(sql).toContain(
      "winner must belong to the same tournament submission",
    );
  });

  it("defines lifecycle foreign keys, timestamp triggers, and required indexes", () => {
    expect(sql).toContain(
      "references public.tournament_submissions(id) on delete cascade",
    );
    expect(sql).toContain("references public.players(id) on delete restrict");
    expect(sql).toContain(
      "references public.tournament_stages(id) on delete set null",
    );
    for (const trigger of [
      "tournament_stages_set_updated_at",
      "tournament_teams_set_updated_at",
      "players_set_updated_at",
      "tournament_roster_members_set_updated_at",
      "tournament_matches_set_updated_at",
    ]) {
      expect(sql).toContain(trigger);
    }
    for (const index of [
      "tournament_stages_submission_id_idx",
      "tournament_stages_status_idx",
      "tournament_teams_lower_name_idx",
      "players_normalized_name_idx",
      "players_steam_id_key",
      "players_deadlock_account_id_key",
      "tournament_roster_team_id_idx",
      "tournament_roster_player_id_idx",
      "tournament_matches_submission_id_idx",
      "tournament_matches_stage_id_idx",
      "tournament_matches_scheduled_at_idx",
      "tournament_matches_status_idx",
      "tournament_matches_team_a_id_idx",
      "tournament_matches_team_b_id_idx",
      "tournament_matches_deadlock_match_id_idx",
    ]) {
      expect(sql).toContain(index);
    }
  });

  it("contains no destructive or deferred-scope schema", () => {
    expect(sql).not.toMatch(/\bdrop\s+(?:table|function)\b/i);
    expect(sql).not.toContain("winner_to_match_id");
    expect(sql).not.toContain("loser_to_match_id");
    expect(sql).not.toContain("jsonb");
    expect(sql).not.toMatch(/broadcast.*talent/i);
    expect(sql).not.toMatch(/pick.*ban/i);
  });
});
