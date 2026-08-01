import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const organizer = fs.readFileSync(
  path.join(process.cwd(), "src/app/workspace/[token]/import/actions.ts"),
  "utf8",
);
const admin = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/app/admin/(protected)/submissions/[id]/import/actions.ts",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(process.cwd(), "src/lib/tournament-import/import.service.ts"),
  "utf8",
);

describe("import server action contract", () => {
  it("requires organizer/admin access and never accepts an actor or submission from form data", () => {
    expect(organizer).toContain("validateWorkspaceAccess(rawToken)");
    expect(admin).toContain("requireAdmin()");
    expect(organizer).not.toMatch(/formData\.get\(["']submissionId/);
    expect(admin).not.toMatch(/formData\.get\(["']actor/);
    expect(service).not.toContain("rawToken:");
  });

  it("revalidates organizer, admin and both locale public projections after apply", () => {
    expect(organizer).toContain("revalidatePublicTournamentProjection");
    expect(organizer).toContain("/matches");
    expect(organizer).toContain("/admin/submissions/");
    expect(admin).toContain("revalidatePublicTournamentProjection");
  });

  it("keeps every export from use-server modules async", () => {
    for (const source of [organizer, admin]) {
      expect(source).toMatch(/^"use server"/);
      expect(source).not.toMatch(
        /export\s+(?:const|let|var|class|type|interface)\s+/,
      );
      expect(source.match(/export async function/g)?.length).toBeGreaterThan(0);
    }
  });
});
