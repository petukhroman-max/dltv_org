import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repository = readFileSync(
  join(
    process.cwd(),
    "src/lib/public-tournaments/public-operational.repository.ts",
  ),
  "utf8",
);
const service = readFileSync(
  join(
    process.cwd(),
    "src/lib/public-tournaments/public-operational.service.ts",
  ),
  "utf8",
);
const page = readFileSync(
  join(process.cwd(), "src/app/tournaments/[slug]/page.tsx"),
  "utf8",
);
const workspaceActions = readFileSync(
  join(process.cwd(), "src/app/workspace/[token]/actions.ts"),
  "utf8",
);
const adminActions = readFileSync(
  join(
    process.cwd(),
    "src/app/admin/(protected)/submissions/[id]/operational-actions.ts",
  ),
  "utf8",
);

describe("public operational security contract", () => {
  it("keeps operational reads server-only and uses explicit selections", () => {
    expect(repository).toMatch(/^import "server-only";/);
    expect(service).toMatch(/^import "server-only";/);
    expect(repository).not.toMatch(/\.select\(["'`]\*["'`]\)/);
    for (const privateField of [
      "real_name",
      "steam_id",
      "deadlock_account_id",
      "external_player_id",
      "normalized_name",
      "token_hash",
    ]) {
      expect(repository).not.toContain(privateField);
    }
  });

  it("requires slug orchestration and never accepts a public submission UUID", () => {
    expect(service.indexOf("dependencies.resolve(slug)")).toBeLessThan(
      service.indexOf("dependencies.stages(tournament.submission_id)"),
    );
    expect(page).toContain("loadPublicTournamentProjection(slug, locale)");
    expect(page).not.toContain("submission_id");
    expect(page).not.toContain("createSupabase");
  });

  it("does not add public operational RLS policies or a migration", () => {
    expect(repository).toContain("createSupabaseAdminClient");
    expect(repository).not.toContain("anonKey");
    expect(repository).not.toContain("createClient(");
  });

  it("invalidates the cached projection after trusted operational mutations", () => {
    expect(workspaceActions).toContain("revalidatePublicTournamentProjection");
    expect(adminActions).toContain("revalidatePublicTournamentProjection");
  });
});
