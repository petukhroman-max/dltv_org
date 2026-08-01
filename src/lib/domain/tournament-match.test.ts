import { describe, expect, it } from "vitest";

import {
  canTransitionMatch,
  completeMatchSchema,
  createTournamentMatchMutationSchema,
  createWalkoverSchema,
  updateTournamentMatchMutationSchema,
} from "@/lib/domain/tournament-match";

const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
const stage = "00000000-0000-4000-8000-000000000003";
const version = "2026-08-01T10:00:00.000Z";

describe("tournament match domain", () => {
  it("accepts TBD teams for drafts and one TBD team for scheduled matches", () => {
    expect(
      createTournamentMatchMutationSchema.safeParse({
        stage_id: null,
        match_number: null,
        round_name: "",
        group_name: "",
        scheduled_at: null,
        timezone: "UTC",
        best_of: null,
        team_a_id: null,
        team_b_id: null,
        stream_url: "",
        is_public: true,
        status: "draft",
      }).success,
    ).toBe(true);
    expect(
      createTournamentMatchMutationSchema.safeParse({
        stage_id: stage,
        scheduled_at: "2026-08-08T10:00:00.000Z",
        timezone: "UTC",
        best_of: 3,
        team_a_id: a,
        team_b_id: null,
        is_public: true,
        status: "scheduled",
      }).success,
    ).toBe(true);
  });

  it("rejects equal teams, even best-of, invalid URLs, and incomplete scheduling", () => {
    const base = {
      id: a,
      expected_updated_at: version,
      stage_id: stage,
      scheduled_at: "2026-08-08T10:00:00.000Z",
      timezone: "UTC",
      best_of: 3,
      team_a_id: b,
      team_b_id: b,
      stream_url: "javascript:alert(1)",
      is_public: true,
    };
    const parsed = updateTournamentMatchMutationSchema.safeParse(base);
    expect(parsed.success).toBe(false);
    expect(
      createTournamentMatchMutationSchema.safeParse({
        ...base,
        id: undefined,
        expected_updated_at: undefined,
        team_b_id: null,
        best_of: 2,
        status: "scheduled",
      }).success,
    ).toBe(false);
    expect(
      createTournamentMatchMutationSchema.safeParse({
        ...base,
        id: undefined,
        expected_updated_at: undefined,
        team_b_id: null,
        stage_id: null,
        status: "scheduled",
      }).success,
    ).toBe(false);
  });

  it("derives a completed winner from a non-drawn score", () => {
    expect(
      completeMatchSchema.safeParse({
        id: stage,
        expected_updated_at: version,
        team_a_id: a,
        team_b_id: b,
        score_a: 2,
        score_b: 1,
        deadlock_match_id: "match-123",
        duration_seconds: 1800,
        vod_url: "https://example.com/vod",
      }).success,
    ).toBe(true);
    expect(
      completeMatchSchema.safeParse({
        id: stage,
        expected_updated_at: version,
        team_a_id: a,
        team_b_id: b,
        score_a: 1,
        score_b: 1,
      }).success,
    ).toBe(false);
  });

  it("requires a participating walkover winner", () => {
    expect(
      createWalkoverSchema.safeParse({
        id: stage,
        expected_updated_at: version,
        team_a_id: a,
        team_b_id: b,
        winner_team_id: stage,
      }).success,
    ).toBe(false);
  });

  it("allows only documented ordinary and explicit reopen transitions", () => {
    expect(canTransitionMatch("draft", "scheduled")).toBe(true);
    expect(canTransitionMatch("scheduled", "completed")).toBe(true);
    expect(canTransitionMatch("completed", "live")).toBe(false);
    expect(canTransitionMatch("completed", "live", true)).toBe(true);
    expect(canTransitionMatch("completed", "scheduled", true)).toBe(false);
    expect(canTransitionMatch("cancelled", "draft", true)).toBe(true);
    expect(canTransitionMatch("walkover", "scheduled", true)).toBe(true);
  });
});
