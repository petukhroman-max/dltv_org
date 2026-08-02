import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { handleApiOptions } from "@/lib/public-api/cors";

function preflight(headers: Record<string, string>) {
  return new NextRequest("https://deadlock.one/api/v1/tournaments", {
    method: "OPTIONS",
    headers,
  });
}

describe("Public API CORS", () => {
  const validHeaders = {
    origin: "https://partner.example",
    "access-control-request-method": "GET",
    "access-control-request-headers": "Authorization, Content-Type",
  };
  it("allows a configured origin without wildcard or credentials", async () => {
    const response = await handleApiOptions(
      preflight(validHeaders),
      async () => true,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      validHeaders.origin,
    );
    expect(response.headers.get("Access-Control-Allow-Origin")).not.toBe("*");
    expect(response.headers.has("Access-Control-Allow-Credentials")).toBe(
      false,
    );
  });
  it("denies unknown origins, unsupported methods, and unsupported headers", async () => {
    await expect(
      handleApiOptions(preflight(validHeaders), async () => false),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleApiOptions(
        preflight({ ...validHeaders, "access-control-request-method": "POST" }),
        async () => true,
      ),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      handleApiOptions(
        preflight({
          ...validHeaders,
          "access-control-request-headers": "X-Secret",
        }),
        async () => true,
      ),
    ).resolves.toMatchObject({ status: 403 });
  });
  it("does not require CORS for server-to-server GET requests", () => {
    const request = new NextRequest("https://deadlock.one/api/v1/tournaments");
    expect(request.headers.get("origin")).toBeNull();
  });
});
