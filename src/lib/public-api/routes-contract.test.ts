import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routes = [
  ["tournaments/route.ts", "tournaments.list"],
  ["tournaments/[slug]/route.ts", "tournaments.detail"],
  ["tournaments/[slug]/stages/route.ts", "stages.list"],
  ["tournaments/[slug]/teams/route.ts", "teams.list"],
  ["tournaments/[slug]/matches/route.ts", "matches.list"],
  ["tournaments/[slug]/bracket/route.ts", "bracket.read"],
  ["tournaments/[slug]/standings/route.ts", "standings.read"],
] as const;

describe("Public API route contract", () => {
  it.each(routes)(
    "protects and supports preflight for %s",
    (file, endpoint) => {
      const source = fs.readFileSync(
        path.join(process.cwd(), "src/app/api/v1", file),
        "utf8",
      );
      expect(source).toContain(`withApiAuth(request, "${endpoint}"`);
      expect(source).toContain("export async function GET");
      expect(source).toContain("export async function OPTIONS");
    },
  );

  it("uses the existing published boundary and allowlisted projection", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/public-api/public-data.ts"),
      "utf8",
    );
    expect(source).toContain('.eq("visibility_status", "published")');
    expect(source).toContain("getPublicTournamentProjection");
    expect(source).toContain("toApiMatch");
    expect(source).not.toContain("createSupabaseBrowserClient");
  });

  it("logs bounded metadata without authorization, query strings, IPs, or bodies", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/public-api/http.ts"),
      "utf8",
    );
    expect(source).toContain('.from("api_usage_logs")');
    expect(source).toContain("response_status");
    expect(source).not.toContain('headers.get("authorization")');
    expect(source).not.toContain("searchParams");
    expect(source).not.toContain("ip_address");
    expect(source).not.toContain("response_body");
  });
});
