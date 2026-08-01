import { describe, expect, it } from "vitest";

import robots from "@/app/robots";

describe("robots", () => {
  it("allows the public catalog and blocks private workflows", () => {
    const result = robots();
    expect(result.rules).toMatchObject({
      allow: expect.arrayContaining(["/tournaments", "/tournaments/"]),
      disallow: expect.arrayContaining([
        "/admin/",
        "/edit-submission/",
        "/workspace/",
        "/auth/",
        "/submit-tournament/success",
      ]),
    });
  });
});
