import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/(protected)/submissions/[id]/actions", () => ({
  createSubmissionEditLinkAction: vi.fn(),
  revokeSubmissionEditLinksAction: vi.fn(),
}));

import { AdminEditLinkPanel } from "@/components/admin/admin-edit-link-panel";

describe("AdminEditLinkPanel", () => {
  it("shows state and explains that plaintext is not persisted", () => {
    render(
      <AdminEditLinkPanel
        submissionId="b1f0a925-b6f0-43ab-8e63-a7280fe7a870"
        tokenStatus={{
          id: "397d93ec-7cb7-4829-8217-f07f5b13278b",
          state: "active",
          expiresAt: "2026-08-07T10:00:00.000Z",
          createdAt: "2026-07-31T10:00:00.000Z",
        }}
      />,
    );
    expect(screen.getByText(/Current link status:/)).toHaveTextContent(
      "Active edit link expires at",
    );
    expect(screen.getByText(/unavailable after refresh/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create new link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Revoke edit link" }),
    ).toBeInTheDocument();
  });
});
