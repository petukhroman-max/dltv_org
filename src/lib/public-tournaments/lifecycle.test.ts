import { describe, expect, it } from "vitest";

import { getTournamentLifecycle } from "@/lib/public-tournaments/lifecycle";

describe("tournament lifecycle", () => {
  it.each([
    ["2026-08-10", "2026-08-12", "2026-08-09", "upcoming"],
    ["2026-08-10", "2026-08-12", "2026-08-10", "ongoing"],
    ["2026-08-10", "2026-08-12", "2026-08-12", "ongoing"],
    ["2026-08-10", "2026-08-12", "2026-08-13", "completed"],
  ] as const)(
    "classifies UTC date lifecycle",
    (start, end, today, expected) => {
      expect(getTournamentLifecycle(start, end, today)).toBe(expected);
    },
  );
});
