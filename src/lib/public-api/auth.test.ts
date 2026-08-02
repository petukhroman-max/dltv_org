import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { authenticateApiRequest } from "@/lib/public-api/auth";
import { hashApiKey } from "@/lib/public-api/key-security";

const pepper = "s".repeat(32);
const rawKey = `dltv_test_${"A".repeat(43)}`;
const keyHash = hashApiKey(rawKey, pepper);
const key = {
  id: "10000000-0000-4000-8000-000000000001",
  client_id: "20000000-0000-4000-8000-000000000001",
  key_prefix: rawKey.slice(0, 20),
  key_hash: keyHash,
  label: null,
  status: "active",
  last_used_at: null,
  expires_at: null,
  revoked_at: null,
  created_at: "2026-08-02T00:00:00Z",
  created_by: null,
  updated_at: "2026-08-02T00:00:00Z",
};
const client = {
  id: key.client_id,
  access_request_id: null,
  organization_name: "Example",
  client_slug: "example",
  website_url: "https://example.com",
  status: "active",
  attribution_status: "compliant",
  attribution_checked_at: null,
  attribution_check_note: null,
  default_rate_limit_per_minute: 60,
  default_rate_limit_per_day: 10000,
  allowed_origins: ["https://example.com"],
  allowed_endpoints: ["matches.list"],
  created_at: "2026-08-02T00:00:00Z",
  updated_at: "2026-08-02T00:00:00Z",
};

function request(value?: string) {
  return { headers: new Headers(value ? { authorization: value } : {}) };
}

const dependencies = {
  pepper: () => pepper,
  findKey: vi.fn(async (hash: string) => (hash === keyHash ? key : null)),
  findClient: vi.fn(async () => client),
  consumeRateLimit: vi.fn(async () => ({
    allowed: true,
    minute_remaining: 59,
    day_remaining: 9999,
  })),
};

describe("public API authentication", () => {
  it("accepts only an exact Bearer header and returns an isolated context", async () => {
    const result = await authenticateApiRequest(
      request(`Bearer ${rawKey}`),
      "matches.list",
      dependencies,
    );
    expect(result).toMatchObject({
      ok: true,
      context: { clientSlug: "example", apiKeyId: key.id },
    });
    expect(result).not.toHaveProperty("context.keyHash");
  });

  it.each([undefined, rawKey, `Basic ${rawKey}`, `Bearer ${rawKey} extra`])(
    "rejects unsupported credential transport",
    async (authorization) => {
      expect(
        await authenticateApiRequest(
          request(authorization),
          "matches.list",
          dependencies,
        ),
      ).toMatchObject({ ok: false, status: 401 });
    },
  );

  it("enforces the endpoint allowlist", async () => {
    expect(
      await authenticateApiRequest(
        request(`Bearer ${rawKey}`),
        "teams.list",
        dependencies,
      ),
    ).toMatchObject({ ok: false, status: 403, code: "ENDPOINT_NOT_ALLOWED" });
  });

  it("distinguishes missing, revoked, suspended, expired, and client-suspended access", async () => {
    await expect(
      authenticateApiRequest(request(), "matches.list", dependencies),
    ).resolves.toMatchObject({ code: "API_KEY_REQUIRED", status: 401 });
    for (const [status, code] of [
      ["revoked", "API_KEY_REVOKED"],
      ["suspended", "API_KEY_SUSPENDED"],
    ] as const) {
      await expect(
        authenticateApiRequest(request(`Bearer ${rawKey}`), "matches.list", {
          ...dependencies,
          findKey: vi.fn(async () => ({
            ...key,
            status,
            revoked_at: status === "revoked" ? "2026-08-03T00:00:00Z" : null,
          })),
        }),
      ).resolves.toMatchObject({ code, status: 403 });
    }
    await expect(
      authenticateApiRequest(request(`Bearer ${rawKey}`), "matches.list", {
        ...dependencies,
        findKey: vi.fn(async () => ({
          ...key,
          expires_at: "2020-01-01T00:00:00Z",
        })),
      }),
    ).resolves.toMatchObject({ code: "API_KEY_EXPIRED", status: 401 });
    await expect(
      authenticateApiRequest(request(`Bearer ${rawKey}`), "matches.list", {
        ...dependencies,
        findClient: vi.fn(async () => ({ ...client, status: "suspended" })),
      }),
    ).resolves.toMatchObject({ code: "API_CLIENT_SUSPENDED", status: 403 });
  });

  it("consumes a rate-limit unit before rejecting a forbidden endpoint", async () => {
    const consume = vi.fn(async () => ({
      allowed: true,
      minute_remaining: 58,
      day_remaining: 9998,
    }));
    await authenticateApiRequest(request(`Bearer ${rawKey}`), "teams.list", {
      ...dependencies,
      consumeRateLimit: consume,
    });
    expect(consume).toHaveBeenCalledOnce();
  });

  it("fails closed when the atomic limiter rejects the request", async () => {
    const limited = {
      ...dependencies,
      consumeRateLimit: vi.fn(async () => ({
        allowed: false,
        minute_remaining: 0,
        day_remaining: 1,
      })),
    };
    expect(
      await authenticateApiRequest(
        request(`Bearer ${rawKey}`),
        "matches.list",
        limited,
      ),
    ).toMatchObject({ ok: false, status: 429 });
  });
});
