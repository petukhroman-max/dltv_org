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
const mapper = readFileSync(
  join(
    process.cwd(),
    "src/lib/public-tournaments/public-operational.mapper.ts",
  ),
  "utf8",
);
const revalidation = readFileSync(
  join(
    process.cwd(),
    "src/lib/public-tournaments/public-operational.revalidation.ts",
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
const globalStyles = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("public operational security contract", () => {
  it("keeps operational reads server-only and uses explicit selections", () => {
    expect(repository).toMatch(/^import "server-only";/);
    expect(service).toMatch(/^import "server-only";/);
    expect(repository).not.toMatch(/\.select\(["'`]\*["'`]\)/);
    expect(mapper).not.toContain("return { ...row }");
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
    expect(workspaceActions).toContain(
      "await revalidatePublicTournamentProjection(access.submissionId)",
    );
    expect(adminActions).toContain(
      "await revalidatePublicTournamentProjection(submissionId)",
    );
    expect(revalidation).toContain('.eq("submission_id", submissionId)');
    expect(revalidation).toContain('.eq("visibility_status", "published")');
    expect(revalidation).toContain("/en/tournaments/${slug}");
    expect(revalidation).toContain("/ru/tournaments/${slug}");
    expect(revalidation).not.toContain("anonKey");
    expect(
      workspaceActions.match(/await revalidatePublicTournamentProjection/g),
    ).toHaveLength(4);
    expect(
      adminActions.match(/await revalidatePublicTournamentProjection/g),
    ).toHaveLength(4);
  });

  it("logs only fixed warning codes without row payloads", () => {
    expect(service).toContain(
      "console.warn(`[public-tournament-projection] ${code}`)",
    );
    expect(service).not.toContain("console.warn(row");
    expect(service).not.toContain("console.warn(tournament");
  });

  it("keeps the public projection responsive without page-level overflow", () => {
    expect(globalStyles).toContain("@media (max-width: 42rem)");
    expect(globalStyles).toContain(".publicSectionNav");
    expect(globalStyles).toContain("overflow-x: auto");
    expect(globalStyles).toContain(".publicMatchCard");
    expect(globalStyles).toContain("min-width: 0");
    expect(globalStyles).toContain("overflow-wrap: anywhere");
  });
});
