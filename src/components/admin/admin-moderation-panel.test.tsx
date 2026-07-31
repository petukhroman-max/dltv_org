import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/admin/(protected)/submissions/[id]/actions", () => ({
  approveSubmissionAction: vi.fn(),
  rejectSubmissionAction: vi.fn(),
  requestChangesAction: vi.fn(),
  publishSubmissionAction: vi.fn(),
  initialModerationActionState: { status: "idle" },
}));

import {
  AdminModerationPanel,
  ModerationActionFeedback,
  ModerationSubmitButtonView,
} from "@/components/admin/admin-moderation-panel";
import { submissionId } from "@/test/admin-fixtures";

describe("AdminModerationPanel", () => {
  it("shows exactly three submitted actions", () => {
    render(
      <AdminModerationPanel submissionId={submissionId} status="submitted" />,
    );

    expect(
      screen.getByRole("heading", { name: "Approve" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Request changes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reject" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Publish" })).toBeNull();
  });

  it("shows publish and request changes for approved submissions", () => {
    render(
      <AdminModerationPanel submissionId={submissionId} status="approved" />,
    );

    expect(
      screen.getByRole("heading", { name: "Publish" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Request changes" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reject" })).toBeNull();
  });

  it("shows only request changes for published submissions", () => {
    render(
      <AdminModerationPanel submissionId={submissionId} status="published" />,
    );

    expect(
      screen.getByRole("heading", { name: "Request changes" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Publish" })).toBeNull();
  });

  it.each([
    ["needs_changes", "Waiting for organizer changes."],
    ["rejected", "This submission was rejected."],
    ["draft", "Draft submissions cannot be moderated."],
  ] as const)("renders %s as read-only", (status, message) => {
    render(
      <AdminModerationPanel submissionId={submissionId} status={status} />,
    );

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows safe validation and conflict messages", () => {
    const { rerender } = render(
      <ModerationActionFeedback
        state={{
          status: "error",
          message: "Reviewer note is required.",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Reviewer note is required.",
    );

    rerender(
      <ModerationActionFeedback
        state={{
          status: "conflict",
          message:
            "This submission was updated by another administrator. Refresh the page and try again.",
        }}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This submission was updated by another administrator.",
    );
  });

  it("disables a pending action and shows its pending label", () => {
    render(
      <ModerationSubmitButtonView
        label="Confirm approval"
        pendingLabel="Approving…"
        pending
      />,
    );

    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
  });
});
