import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  apiKeyHashesEqual,
  generateApiKey,
  hashApiKey,
  isApiKeyFormat,
} from "@/lib/public-api/key-security";

describe("public API key security", () => {
  const pepper = "p".repeat(32);

  it("generates a 256-bit environment-prefixed secret", () => {
    const first = generateApiKey("live");
    const second = generateApiKey("test");
    expect(first.rawKey).toMatch(/^dltv_live_[A-Za-z0-9_-]{43}$/);
    expect(second.rawKey).toMatch(/^dltv_test_[A-Za-z0-9_-]{43}$/);
    expect(first.rawKey).not.toBe(generateApiKey("live").rawKey);
    expect(first.prefix).toHaveLength(20);
  });

  it("stores a peppered HMAC and compares fixed-length hashes", () => {
    const raw = generateApiKey("test").rawKey;
    const hash = hashApiKey(raw, pepper);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(raw);
    expect(apiKeyHashesEqual(hash, hashApiKey(raw, pepper))).toBe(true);
    expect(apiKeyHashesEqual(hash, hashApiKey(raw, "q".repeat(32)))).toBe(
      false,
    );
  });

  it("rejects malformed keys and weak peppers", () => {
    expect(isApiKeyFormat("dltv_live_not-enough-entropy")).toBe(false);
    expect(() => hashApiKey("anything", "weak")).toThrow();
  });
});
