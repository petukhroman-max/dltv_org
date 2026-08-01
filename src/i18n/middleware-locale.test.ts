import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

describe("locale routing middleware", () => {
  it.each([
    ["/", "/en"],
    ["/submit-tournament", "/en/submit-tournament"],
    ["/tournaments/cup", "/en/tournaments/cup"],
    ["/admin/login", "/en/admin/login"],
    ["/workspace/secret-token", "/en/workspace/secret-token"],
    ["/edit-submission/edit-token", "/en/edit-submission/edit-token"],
  ])("redirects %s to stable English URL", async (path, expected) => {
    const response = await middleware(
      new NextRequest(`https://portal.example${path}`),
    );
    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location")!).pathname).toBe(expected);
  });

  it("rewrites a localized secret route and keeps private headers", async () => {
    const response = await middleware(
      new NextRequest("https://portal.example/ru/workspace/secret-token"),
    );
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://portal.example/workspace/secret-token",
    );
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
