import { describe, expect, it, vi } from "vitest";

import { authorizeAdmin } from "@/lib/admin/authorization";

const user = {
  id: "846f55c2-37da-4074-9dde-62ae4ff8a3cc",
  email: "Admin@Example.com",
};

describe("authorizeAdmin", () => {
  it("returns unauthenticated without a Supabase user", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockResolvedValue(null),
      getAdminUserByUserId: vi.fn(),
    });

    expect(result).toEqual({ kind: "unauthenticated" });
  });

  it("returns unauthenticated when Supabase cannot validate the session", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockRejectedValue(new Error("auth unavailable")),
      getAdminUserByUserId: vi.fn(),
    });

    expect(result).toEqual({ kind: "unauthenticated" });
  });

  it("returns unauthorized when the authenticated user is absent from admin_users", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockResolvedValue(user),
      getAdminUserByUserId: vi.fn().mockResolvedValue(null),
    });

    expect(result).toEqual({ kind: "unauthorized" });
  });

  it("returns unauthorized when the database email does not match", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockResolvedValue(user),
      getAdminUserByUserId: vi.fn().mockResolvedValue({
        user_id: user.id,
        email: "other@example.com",
      }),
    });

    expect(result).toEqual({ kind: "unauthorized" });
  });

  it("fails closed without exposing a database lookup error", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockResolvedValue(user),
      getAdminUserByUserId: vi
        .fn()
        .mockRejectedValue(new Error("database connection detail")),
    });

    expect(result).toEqual({ kind: "unauthorized" });
    expect(JSON.stringify(result)).not.toContain("database connection detail");
  });

  it("authorizes an exact user id and case-insensitive email match", async () => {
    const result = await authorizeAdmin({
      getCurrentUser: vi.fn().mockResolvedValue(user),
      getAdminUserByUserId: vi.fn().mockResolvedValue({
        user_id: user.id,
        email: "admin@example.com",
      }),
    });

    expect(result).toEqual({
      kind: "admin",
      identity: { userId: user.id, email: "admin@example.com" },
    });
  });
});
