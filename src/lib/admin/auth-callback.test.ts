import { describe, expect, it, vi } from "vitest";

import {
  AUTH_CALLBACK_DESTINATIONS,
  resolveAuthCallbackDestination,
} from "@/lib/admin/auth-callback";

describe("resolveAuthCallbackDestination", () => {
  it("rejects a missing code without an exchange", async () => {
    const exchangeCodeForSession = vi.fn();

    const result = await resolveAuthCallbackDestination(null, {
      exchangeCodeForSession,
      authorizeCurrentUser: vi.fn(),
    });

    expect(result).toBe(AUTH_CALLBACK_DESTINATIONS.loginError);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("routes an authorized admin to submissions", async () => {
    const result = await resolveAuthCallbackDestination("code", {
      exchangeCodeForSession: vi.fn().mockResolvedValue(undefined),
      authorizeCurrentUser: vi.fn().mockResolvedValue({
        kind: "admin",
        identity: { userId: "user-id", email: "admin@example.com" },
      }),
    });

    expect(result).toBe(AUTH_CALLBACK_DESTINATIONS.submissions);
  });

  it("routes a signed-in non-admin to the access denied page", async () => {
    const result = await resolveAuthCallbackDestination("code", {
      exchangeCodeForSession: vi.fn().mockResolvedValue(undefined),
      authorizeCurrentUser: vi.fn().mockResolvedValue({ kind: "unauthorized" }),
    });

    expect(result).toBe(AUTH_CALLBACK_DESTINATIONS.unauthorized);
  });

  it("returns a generic login error when code exchange fails", async () => {
    const result = await resolveAuthCallbackDestination("bad-code", {
      exchangeCodeForSession: vi
        .fn()
        .mockRejectedValue(new Error("provider detail")),
      authorizeCurrentUser: vi.fn(),
    });

    expect(result).toBe(AUTH_CALLBACK_DESTINATIONS.loginError);
    expect(result).not.toContain("provider detail");
  });
});
