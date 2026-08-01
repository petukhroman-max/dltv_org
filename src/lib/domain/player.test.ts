import { describe, expect, it } from "vitest";

import {
  createPlayerSchema,
  normalizePlayerName,
  toSafeAdminPlayer,
} from "@/lib/domain/player";
import { makePlayer } from "@/test/tournament-operational-fixtures";

describe("player schema", () => {
  it("accepts duplicate display names without claiming global identity", () => {
    const input = {
      display_name: " PlayerOne ",
      normalized_name: "playerone",
      country_code: "DE",
    };
    expect(createPlayerSchema.parse(input).display_name).toBe("PlayerOne");
    expect(createPlayerSchema.safeParse(input).success).toBe(true);
    expect(normalizePlayerName(" PlayerOne ")).toBe("playerone");
  });

  it("allows no real name and rejects an invalid country code", () => {
    expect(
      createPlayerSchema.safeParse({
        display_name: "PlayerOne",
        normalized_name: "playerone",
      }).success,
    ).toBe(true);
    expect(
      createPlayerSchema.safeParse({
        display_name: "PlayerOne",
        normalized_name: "playerone",
        country_code: "deu",
      }).success,
    ).toBe(false);
  });

  it("excludes private real_name from the safe admin read model", () => {
    const safePlayer = toSafeAdminPlayer(makePlayer());
    expect(safePlayer).not.toHaveProperty("real_name");
  });
});
