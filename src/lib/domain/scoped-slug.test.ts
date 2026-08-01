import { describe, expect, it } from "vitest";

import {
  appendScopedSlugSuffix,
  createScopedSlug,
  resolveScopedSlug,
} from "@/lib/domain/scoped-slug";

describe("scoped slug helpers", () => {
  it("normalizes separators, trims hyphens, and falls back", () => {
    expect(createScopedSlug("  Group__Stage 1  ")).toBe("group-stage-1");
    expect(createScopedSlug("---")).toBe("item");
    expect(appendScopedSlugSuffix("group-stage", 2)).toBe("group-stage-2");
  });

  it("preserves an existing slug unless regeneration is explicit", () => {
    expect(
      resolveScopedSlug({ name: "New name", existingSlug: "stable-slug" }),
    ).toBe("stable-slug");
    expect(
      resolveScopedSlug({
        name: "New name",
        existingSlug: "stable-slug",
        regenerate: true,
      }),
    ).toBe("new-name");
  });
});
