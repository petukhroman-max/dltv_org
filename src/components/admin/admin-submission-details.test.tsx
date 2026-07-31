import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminSubmissionDetails } from "@/components/admin/admin-submission-details";
import {
  makeEvent,
  makeOrganizer,
  makeSubmission,
} from "@/test/admin-fixtures";

describe("AdminSubmissionDetails", () => {
  it("renders all read-only sections and safe external links", () => {
    render(
      <AdminSubmissionDetails
        details={{
          submission: makeSubmission(),
          organizer: makeOrganizer(),
          events: [makeEvent()],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Tournament" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Organizer" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Links" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Audit history" }),
    ).toBeInTheDocument();

    const registration = screen.getByRole("link", {
      name: "https://example.com/register",
    });
    expect(registration).toHaveAttribute("target", "_blank");
    expect(registration).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("rejects unsafe links and redacts sensitive event metadata", () => {
    render(
      <AdminSubmissionDetails
        details={{
          submission: makeSubmission({
            registration_url: "javascript:alert(1)",
          }),
          organizer: makeOrganizer(),
          events: [
            makeEvent({
              metadata: {
                note: "<script>alert(1)</script>",
                access_token: "do-not-render",
              },
            }),
          ],
        }}
      />,
    );

    expect(screen.queryByRole("link", { name: /javascript:/i })).toBeNull();
    expect(screen.getByText(/\[redacted\]/)).toBeInTheDocument();
    expect(screen.queryByText("do-not-render")).toBeNull();
    expect(
      screen.getByText(/<script>alert\(1\)<\/script>/),
    ).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("renders known moderation events with readable labels and notes", () => {
    render(
      <AdminSubmissionDetails
        details={{
          submission: makeSubmission({ status: "rejected" }),
          organizer: makeOrganizer(),
          events: [
            makeEvent({
              event_type: "submission_rejected",
              from_status: "submitted",
              to_status: "rejected",
              actor_type: "admin",
              metadata: {
                reviewer_note: "Tournament rules are incomplete.",
                moderation_source: "admin_portal",
                moderation_version: "v1",
              },
            }),
            makeEvent({
              id: "bb2b441b-dba0-4793-8b77-ef166615be22",
              event_type: "submission_approved",
              from_status: "submitted",
              to_status: "approved",
              actor_type: "admin",
              metadata: { reviewer_note: null },
            }),
            makeEvent({
              id: "bc887500-b2b0-49b7-b7bc-c5cce7f41f44",
              event_type: "changes_requested",
              from_status: "approved",
              to_status: "needs_changes",
              actor_type: "admin",
              metadata: { reviewer_note: "Update the schedule." },
            }),
            makeEvent({
              id: "f240f9ad-22a3-416b-b4bd-c6fe31919272",
              event_type: "submission_published",
              from_status: "approved",
              to_status: "published",
              actor_type: "admin",
              metadata: { reviewer_note: null },
            }),
          ],
        }}
      />,
    );

    expect(screen.getByText("Rejected by admin")).toBeInTheDocument();
    expect(screen.getByText("Approved by admin")).toBeInTheDocument();
    expect(screen.getByText("Changes requested")).toBeInTheDocument();
    expect(
      screen.getByText("Published", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tournament rules are incomplete."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/moderation_source/)).toBeNull();
  });
});
