import { describe, expect, it } from "vitest";

import { publicEnvSchema } from "@/lib/env";

describe("publicEnvSchema", () => {
  it("allows the application shell to run without Supabase configuration", () => {
    expect(publicEnvSchema.parse({})).toEqual({});
  });

  it("validates configured Supabase values", () => {
    expect(() =>
      publicEnvSchema.parse({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "example-key",
      }),
    ).toThrow();
  });
});
