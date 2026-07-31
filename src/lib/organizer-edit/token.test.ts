import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateEditToken, hashEditToken } from "@/lib/organizer-edit/token";

describe("organizer edit tokens", () => {
  it("generates 256-bit base64url tokens", () => {
    const token = generateEditToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateEditToken()).not.toBe(token);
  });

  it("stores a deterministic SHA-256 hash rather than the raw token", () => {
    const token = "A".repeat(43);
    const hash = hashEditToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashEditToken(token)).toBe(hash);
  });

  it("produces different hashes for different tokens", () => {
    expect(hashEditToken("A".repeat(43))).not.toBe(
      hashEditToken("B".repeat(43)),
    );
  });

  it.each(["", "short", "!".repeat(43), "A".repeat(44)])(
    "rejects malformed token %j",
    (token) => expect(() => hashEditToken(token)).toThrow(),
  );
});
