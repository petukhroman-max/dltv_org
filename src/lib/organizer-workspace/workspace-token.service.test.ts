import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createWorkspaceLink,
  generateWorkspaceToken,
  hashWorkspaceToken,
  validateWorkspaceAccess,
  WorkspaceLinkError,
} from "@/lib/organizer-workspace/workspace-token.service";
import { submissionId } from "@/test/admin-fixtures";

const admin = {
  userId: "1ada7551-3958-41c6-9da4-47ca541e9fca",
  email: "admin@example.com",
};
const rawToken = "A".repeat(43);
const tokenId = "da5096d0-eaca-4615-a2e4-602a564ec25e";
const now = new Date("2026-08-01T12:00:00Z");

describe("workspace token service", () => {
  it("generates at least 256 bits of unpredictable token material", () => {
    const tokens = new Set(Array.from({ length: 32 }, generateWorkspaceToken));
    expect(tokens.size).toBe(32);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("hashes deterministically without returning the raw token", () => {
    expect(hashWorkspaceToken(rawToken)).toBe(hashWorkspaceToken(rawToken));
    expect(hashWorkspaceToken(rawToken)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashWorkspaceToken(rawToken)).not.toContain(rawToken);
  });

  it("creates a one-time URL and sends only the hash to the RPC", async () => {
    const executeRpc = vi.fn().mockResolvedValue({
      id: tokenId,
      submission_id: submissionId,
      expires_at: "2026-08-31T12:00:00.000Z",
      created_at: now.toISOString(),
      rotated: false,
    });
    const result = await createWorkspaceLink(
      submissionId,
      admin,
      30,
      "Primary",
      now,
      {
        executeRpc,
        generateToken: () => rawToken,
        appUrl: "https://portal.example.com",
      },
    );
    expect(result.workspaceUrl).toBe(
      `https://portal.example.com/workspace/${rawToken}`,
    );
    expect(executeRpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_token_hash: hashWorkspaceToken(rawToken),
        p_expires_at: "2026-08-31T12:00:00.000Z",
      }),
    );
    expect(JSON.stringify(executeRpc.mock.calls)).not.toContain(rawToken);
  });

  it("allows only the server-side expiration allowlist and valid admins", async () => {
    await expect(
      createWorkspaceLink(submissionId, admin, 365, null, now, {
        executeRpc: vi.fn(),
        generateToken: () => rawToken,
        appUrl: "https://portal.example.com",
      }),
    ).rejects.toBeInstanceOf(WorkspaceLinkError);
    await expect(
      createWorkspaceLink(submissionId, { ...admin, userId: "bad" }, 30),
    ).rejects.toBeInstanceOf(WorkspaceLinkError);
  });

  it("accepts an atomically validated token scoped to its submission", async () => {
    const validateHash = vi.fn().mockResolvedValue({
      token_id: tokenId,
      submission: {
        id: submissionId,
        tournament_name: "DLTV Cup",
        status: "submitted",
        region: "EU",
        start_date: "2026-08-10",
        end_date: "2026-08-12",
        timezone: "Europe/Berlin",
        format: null,
      },
    });
    const access = await validateWorkspaceAccess(
      rawToken,
      { validateHash },
      now,
    );
    expect(access).toMatchObject({ tokenId, submission: { id: submissionId } });
    expect(validateHash).toHaveBeenCalledWith(hashWorkspaceToken(rawToken));
    expect(JSON.stringify(validateHash.mock.calls)).not.toContain(rawToken);
  });

  it.each([
    ["wrong format", "bad"],
    ["revoked", rawToken],
    ["expired", rawToken],
  ])("rejects %s tokens generically", async (_case, token) => {
    const access = await validateWorkspaceAccess(
      token!,
      {
        validateHash: vi.fn().mockResolvedValue(null),
      },
      now,
    );
    expect(access).toBeNull();
  });
});
