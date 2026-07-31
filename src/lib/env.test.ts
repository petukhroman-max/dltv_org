import { describe, expect, it } from "vitest";

import { publicEnvSchema } from "@/lib/env";

describe("publicEnvSchema", () => {
  it("allows local development without Supabase configuration", () => {
    expect(publicEnvSchema.parse({ NODE_ENV: "test" })).toEqual({
      NODE_ENV: "test",
    });
  });

  it("validates configured Supabase values", () => {
    expect(() =>
      publicEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "example-key",
      }),
    ).toThrow();
  });

  it("requires public configuration in production", () => {
    expect(() => publicEnvSchema.parse({ NODE_ENV: "production" })).toThrow();
  });
});
