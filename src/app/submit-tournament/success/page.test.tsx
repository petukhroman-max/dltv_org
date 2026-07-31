import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SubmissionSuccessPage from "@/app/submit-tournament/success/page";
import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

describe("SubmissionSuccessPage", () => {
  it("shows only a validated submission reference and submitted status", async () => {
    const id = "08bd117e-7188-49a4-a49b-5122c0a3ea57";
    render(
      await SubmissionSuccessPage({
        searchParams: Promise.resolve({ id }),
      }),
    );

    expect(screen.getByText(id)).toBeInTheDocument();
    expect(
      screen.getByText(publicSubmissionCopy.success.status),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: publicSubmissionCopy.success.another,
      }),
    ).toHaveAttribute("href", "/submit-tournament");
  });

  it("rejects an invalid reference without loading submission data", async () => {
    render(
      await SubmissionSuccessPage({
        searchParams: Promise.resolve({ id: "not-a-uuid" }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      publicSubmissionCopy.success.invalidReference,
    );
    expect(
      screen.queryByText(publicSubmissionCopy.success.status),
    ).not.toBeInTheDocument();
  });
});
