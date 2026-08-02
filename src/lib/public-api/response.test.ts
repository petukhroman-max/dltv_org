import { describe, expect, it } from "vitest";

import { apiError, apiSuccess } from "@/lib/public-api/response";

describe("Public API response contract", () => {
  it("puts pagination beside array data and repeats attribution in headers/meta", async () => {
    const response = apiSuccess(
      [],
      "10000000-0000-4000-8000-000000000001",
      undefined,
      200,
      { next_cursor: null, has_more: false, limit: 50 },
    );
    const body = await response.json();
    expect(body).toMatchObject({
      data: [],
      pagination: { next_cursor: null, has_more: false, limit: 50 },
      meta: {
        attribution_required: true,
        attribution_text: "Data provided by DLTV",
      },
    });
    expect(response.headers.get("X-Data-Provider")).toBe("DLTV");
    expect(response.headers.get("X-Attribution-Required")).toBe("true");
    expect(response.headers.get("X-API-Version")).toBe("v1");
  });
  it("returns a stable English error and Retry-After for 429", async () => {
    const response = apiError("RATE_LIMIT_EXCEEDED", 429, "request-id");
    expect(await response.json()).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded. Retry later.",
        request_id: "request-id",
      },
    });
    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
