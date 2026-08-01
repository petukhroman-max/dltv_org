import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs
  .readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260802090000_add_bracket_standings.sql",
    ),
    "utf8",
  )
  .toLowerCase();

describe("bracket and standings migration contract", () => {
  it("adds the required stage, match and operational entities", () => {
    expect(migration).toContain("add column bracket_type");
    expect(migration).toContain("add column bracket_section");
    expect(migration).toContain("add column bracket_round");
    expect(migration).toContain("add column bracket_position");
    expect(migration).toContain("create table public.tournament_bracket_links");
    expect(migration).toContain(
      "create table public.tournament_stage_standings_config",
    );
    expect(migration).toContain(
      "create table public.tournament_stage_group_teams",
    );
    expect(migration).toContain(
      "create table public.tournament_standing_adjustments",
    );
  });

  it("guards scope, cycles, target results and coordinate conflicts", () => {
    expect(migration).toContain("bracket_link_scope_invalid");
    expect(migration).toContain("bracket_standings_scope_invalid");
    expect(migration).toContain("bracket_link_cycle");
    expect(migration).toContain("bracket_target_has_result");
    expect(migration).toContain("tournament_matches_bracket_position_key");
    expect(migration).toContain("bracket_invalid_round_direction");
    expect(migration).toContain("bracket_target_slot_occupied");
    expect(migration).toContain("third_place");
    expect(migration).toContain("source_match_id <> target_match_id");
    expect(migration).toContain("tournament_bracket_links_source_outcome_key");
    expect(migration).toContain("tournament_bracket_links_target_slot_key");
    expect(migration).toContain("new.outcome='loser'");
    expect(migration).toContain("double_elimination");
  });

  it("advances completed and walkover outcomes atomically with conflict audit", () => {
    expect(migration).toContain("after update of status, winner_team_id");
    expect(migration).toContain("new.status in ('completed','walkover')");
    expect(migration).toContain("bracket_team_advanced");
    expect(migration).toContain("bracket_advancement_conflict");
    expect(migration).toContain("if v_existing is null");
    expect(migration).toContain("when 'winner' then v_match.winner_team_id");
    expect(migration).toContain("v_match.team_a_id = v_match.winner_team_id");
    expect(migration).not.toContain(
      "create trigger tournament_matches_advance_bracket after update of status, winner_team_id, team_a_id, team_b_id",
    );
  });

  it("derives standings only from final results with deterministic ranking", () => {
    expect(migration).toContain("m.status in('completed','walkover')");
    expect(migration).toContain("s.rank_override asc nulls last");
    expect(migration).toContain("s.points desc");
    expect(migration).toContain("s.wins desc");
    expect(migration).toContain(
      "case when s.score_difference_enabled then s.score_for-s.score_against else 0 end",
    );
    expect(migration).toContain("s.score_for desc");
    expect(migration).toContain("s.seed asc nulls last");
    expect(migration).toContain("s.name asc");
    expect(migration).toContain("points_for_walkover");
    expect(migration).toContain("qualified_override");
    expect(migration).toContain("public_note");
  });

  it("uses guarded security-definer RPCs without client-role access", () => {
    const names = [
      "assign_match_bracket_position",
      "create_tournament_bracket_link",
      "delete_tournament_bracket_link",
      "advance_tournament_bracket_outcome",
      "update_stage_standings_config",
      "assign_team_to_stage_group",
      "remove_team_from_stage_group",
      "upsert_standing_adjustment",
      "delete_standing_adjustment",
    ];
    for (const name of names) {
      const start = migration.indexOf(`function public.${name}`);
      expect(start).toBeGreaterThan(-1);
      expect(migration.slice(start, start + 900)).toContain("security definer");
    }
    expect(migration).toContain("from public,anon,authenticated");
    expect(migration).toContain("assert_operational_mutation_access");
  });
});
