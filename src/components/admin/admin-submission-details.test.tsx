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
});
