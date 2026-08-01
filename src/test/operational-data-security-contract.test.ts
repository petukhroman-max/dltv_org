import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function collectSource(directory: string): string {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectSource(path);
      return /\.(?:ts|tsx)$/.test(entry.name) ? readFileSync(path, "utf8") : "";
    })
    .join("\n");
}

describe("operational data security boundaries", () => {
  it("keeps operational repositories server-only", () => {
    const repository = readFileSync(
      join(
        process.cwd(),
        "src",
        "lib",
        "repositories",
        "tournament-operational-data.ts",
      ),
      "utf8",
    );
    expect(repository.trimStart().startsWith('import "server-only"')).toBe(
      true,
    );
    expect(repository).toContain("createSupabaseAdminClient");
  });

  it("does not query operational tables from public routes or components", () => {
    const publicSource = [
      readFileSync(join(process.cwd(), "src", "app", "page.tsx"), "utf8"),
      collectSource(join(process.cwd(), "src", "app", "tournaments")),
      collectSource(join(process.cwd(), "src", "app", "submit-tournament")),
      collectSource(join(process.cwd(), "src", "components", "public")),
    ].join("\n");

    for (const table of [
      "tournament_stages",
      "tournament_teams",
      "tournament_roster_members",
      "tournament_matches",
    ]) {
      expect(publicSource).not.toContain(`.from(\"${table}\")`);
    }
  });

  it("does not grant organizer edit code operational repository access", () => {
    const organizerEditSource = collectSource(
      join(process.cwd(), "src", "lib", "organizer-edit"),
    );
    expect(organizerEditSource).not.toContain("tournament-operational-data");
    expect(organizerEditSource).not.toContain("tournament_stages");
    expect(organizerEditSource).not.toContain("tournament_teams");
  });
});
