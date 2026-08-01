import { describe, expect, it } from "vitest";

import { createTournamentStageSchema } from "@/lib/domain/tournament-stage";
import { submissionId } from "@/test/admin-fixtures";

const validStage = {
  submission_id: submissionId,
  name: " Qualifier ",
  slug: "qualifier",
  stage_type: "qualifier",
  sequence_number: 1,
  start_at: "2026-08-10T10:00:00+02:00",
  end_at: "2026-08-10T18:00:00+02:00",
  timezone: "Europe/Berlin",
  best_of_default: 3,
};

describe("tournament stage schema", () => {
  it.each(["qualifier", "group_stage"])("accepts a valid %s", (stage_type) => {
    expect(
      createTournamentStageSchema.parse({ ...validStage, stage_type }).name,
    ).toBe("Qualifier");
  });

  it("rejects invalid sequence, even best-of, reverse dates, and timezone", () => {
    expect(
      createTournamentStageSchema.safeParse({
        ...validStage,
        sequence_number: 0,
      }).success,
    ).toBe(false);
    expect(
      createTournamentStageSchema.safeParse({
        ...validStage,
        best_of_default: 2,
      }).success,
    ).toBe(false);
    expect(
      createTournamentStageSchema.safeParse({
        ...validStage,
        end_at: "2026-08-09T18:00:00+02:00",
      }).success,
    ).toBe(false);
    expect(
      createTournamentStageSchema.safeParse({
        ...validStage,
        timezone: "Mars/Olympus",
      }).success,
    ).toBe(false);
  });
});
