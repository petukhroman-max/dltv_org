import { describe, expect, it } from "vitest";

import { apiAccessRequestSchema } from "@/lib/public-api/access-request.schema";

const valid = {
  organization_name: "Example Media",
  contact_name: "Ada Admin",
  contact_email: "API@EXAMPLE.COM",
  website_url: "https://example.com",
  intended_use: "We publish tournament schedules and results.",
  expected_request_volume: "1,000 requests per day",
  requested_endpoints: ["tournaments.list", "matches.list"],
  attribution_accepted: true,
  terms_accepted: true,
} as const;

describe("API access request schema", () => {
  it("normalizes email and accepts independent consents", () => {
    const parsed = apiAccessRequestSchema.parse(valid);
    expect(parsed.contact_email).toBe("api@example.com");
    expect(parsed.attribution_accepted).toBe(true);
    expect(parsed.terms_accepted).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/plain,no",
    "ftp://example.com",
    "abc",
  ])("rejects unsafe website URL %s", (website_url) =>
    expect(
      apiAccessRequestSchema.safeParse({ ...valid, website_url }).success,
    ).toBe(false),
  );

  it("requires both terms and attribution consent", () => {
    expect(
      apiAccessRequestSchema.safeParse({ ...valid, terms_accepted: false })
        .success,
    ).toBe(false);
    expect(
      apiAccessRequestSchema.safeParse({
        ...valid,
        attribution_accepted: false,
      }).success,
    ).toBe(false);
  });
});
