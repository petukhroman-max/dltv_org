import { describe, expect, it, vi } from "vitest";

import { processAdminMagicLinkRequest } from "@/lib/admin/login";

const copy = {
  invalidEmail: "Invalid email",
  genericSuccess: "Check your inbox if eligible",
};

describe("processAdminMagicLinkRequest", () => {
  it("normalizes a valid email before requesting a magic link", async () => {
    const sendMagicLink = vi.fn().mockResolvedValue(undefined);

    const result = await processAdminMagicLinkRequest(
      " ADMIN@Example.com ",
      sendMagicLink,
      copy,
    );

    expect(sendMagicLink).toHaveBeenCalledWith("admin@example.com");
    expect(result).toEqual({
      status: "success",
      email: "admin@example.com",
      message: copy.genericSuccess,
    });
  });

  it("returns a field validation error for an invalid email", async () => {
    const sendMagicLink = vi.fn();

    const result = await processAdminMagicLinkRequest(
      "not-an-email",
      sendMagicLink,
      copy,
    );

    expect(sendMagicLink).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "error",
      fieldError: copy.invalidEmail,
    });
  });

  it("does not expose Supabase errors or reveal account existence", async () => {
    const result = await processAdminMagicLinkRequest(
      "admin@example.com",
      vi.fn().mockRejectedValue(new Error("raw provider detail")),
      copy,
    );

    expect(result).toEqual({
      status: "success",
      email: "admin@example.com",
      message: copy.genericSuccess,
    });
    expect(JSON.stringify(result)).not.toContain("raw provider detail");
  });
});
