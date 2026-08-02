import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createApiCursor, parseApiCursor } from "@/lib/public-api/cursor";

describe("signed API cursors", () => {
  const secret = "c".repeat(32);
  it("round-trips only in the intended endpoint scope", () => {
    const cursor = createApiCursor("matches:event", "mt_opaque", secret);
    expect(parseApiCursor(cursor, "matches:event", secret)).toBe("mt_opaque");
    expect(parseApiCursor(cursor, "teams:event", secret)).toBeNull();
  });
  it("rejects tampering", () => {
    const cursor = createApiCursor("tournaments", "event", secret);
    expect(
      parseApiCursor(`${cursor.slice(0, -1)}A`, "tournaments", secret),
    ).toBeNull();
  });
});
