import { describe, expect, it } from "vitest";

import {
  createPlayerAndAddToRosterSchema,
  createPlayerSchema,
  normalizePlayerDisplayName,
  playerSearchSchema,
  updateRosterMembershipSchema,
} from "@/lib/domain/roster-management";
import { teamAId } from "@/test/tournament-operational-fixtures";

describe("roster management schemas", () => {
  it("normalizes Unicode, case and repeated whitespace without removing game symbols", () => {
    expect(normalizePlayerDisplayName("  Ａce   [EU]  ")).toBe("ace [eu]");
  });

  it("normalizes optional fields and country codes", () => {
    expect(
      createPlayerSchema.parse({
        display_name: " Ace ",
        country_code: " de ",
        steam_id: "",
        deadlock_account_id: "  account-1  ",
      }),
    ).toEqual({
      display_name: "Ace",
      country_code: "DE",
      steam_id: null,
      deadlock_account_id: "account-1",
    });
  });

  it("requires two search characters and caps display names", () => {
    expect(playerSearchSchema.safeParse({ query: "a" }).success).toBe(false);
    expect(
      createPlayerSchema.safeParse({ display_name: "x".repeat(81) }).success,
    ).toBe(false);
  });

  it("rejects an empty display name and never accepts real_name into the parsed model", () => {
    expect(createPlayerSchema.safeParse({ display_name: "   " }).success).toBe(
      false,
    );
    expect(
      createPlayerSchema.parse({
        display_name: "Ace",
        real_name: "Private Name",
      }),
    ).not.toHaveProperty("real_name");
  });

  it("allows separate players to share a display name", () => {
    const first = createPlayerSchema.parse({ display_name: "Ace" });
    const second = createPlayerSchema.parse({ display_name: "Ace" });
    expect(first.display_name).toBe(second.display_name);
  });

  it("allows all roster roles but only player captains", () => {
    expect(
      createPlayerAndAddToRosterSchema.safeParse({
        tournament_team_id: teamAId,
        role: "manager",
        is_captain: false,
        new_player: { display_name: "Manager" },
      }).success,
    ).toBe(true);
    expect(
      updateRosterMembershipSchema.safeParse({
        tournament_team_id: teamAId,
        membership_id: "d72ca353-10d5-468a-aabb-81a239fbe78f",
        expected_updated_at: "2026-08-01T10:00:00Z",
        role: "coach",
        is_captain: true,
      }).success,
    ).toBe(false);
  });

  it.each(["player", "substitute", "coach", "manager"] as const)(
    "accepts %s membership",
    (role) => {
      expect(
        createPlayerAndAddToRosterSchema.safeParse({
          tournament_team_id: teamAId,
          role,
          is_captain: false,
          new_player: { display_name: "Ace" },
        }).success,
      ).toBe(true);
    },
  );
});
