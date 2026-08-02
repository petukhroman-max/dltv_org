import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  paginateApiItems,
  safeApiUrl,
  toApiMatch,
  toApiTournamentDetails,
} from "@/lib/public-api/public-data";
import { publicTournamentProjectionFixture } from "@/test/public-operational-fixture";

describe("Public API allowlist serializer", () => {
  it("removes internal match references and source fields", () => {
    const match = {
      ...publicTournamentProjectionFixture.matches.upcoming[0],
      deadlock_match_id: "private-source-id",
    };
    expect(toApiMatch(match)).not.toHaveProperty("deadlock_match_id");
    const serialized = JSON.stringify(
      toApiTournamentDetails({
        ...publicTournamentProjectionFixture,
        summary: {
          ...publicTournamentProjectionFixture.summary,
          next_match: match,
        },
      }),
    );
    expect(serialized).not.toContain("source_updated_at");
    expect(serialized).not.toContain("deadlock_match_id");
    expect(serialized).not.toContain("private-source-id");
    expect(serialized).not.toContain("submission_id");
  });

  it("uses deterministic signed cursor pagination and rejects unknown filters", () => {
    process.env.API_KEY_PEPPER = "t".repeat(32);
    const items = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const first = paginateApiItems(
      items,
      new URL("https://example.test?limit=2"),
      "teams:event",
      (item) => item.slug,
    );
    expect(first.items.map((item) => item.slug)).toEqual(["a", "b"]);
    expect(first.pagination).toMatchObject({ has_more: true, limit: 2 });
    const second = paginateApiItems(
      items,
      new URL(
        `https://example.test?limit=2&cursor=${first.pagination.next_cursor}`,
      ),
      "teams:event",
      (item) => item.slug,
    );
    expect(second.items.map((item) => item.slug)).toEqual(["c"]);
    expect(() =>
      paginateApiItems(
        items,
        new URL("https://example.test?private=true"),
        "teams:event",
        (item) => item.slug,
      ),
    ).toThrow("INVALID_FILTER");
  });

  it("contains none of the forbidden private fields after serialization", () => {
    const serialized = JSON.stringify(
      toApiTournamentDetails(publicTournamentProjectionFixture),
    );
    for (const forbidden of [
      "real_name",
      "steam_id",
      "deadlock_account_id",
      "submission_id",
      "workspace_token",
      "contact_email",
      "import_payload",
      "audit_metadata",
    ])
      expect(serialized).not.toContain(forbidden);
  });

  it("does not emit URLs carrying private credentials", () => {
    expect(safeApiUrl("https://example.com/watch?token=secret")).toBeNull();
    expect(safeApiUrl("https://example.com/watch?lang=en#private")).toBe(
      "https://example.com/watch?lang=en",
    );
  });
});
