import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EditSubmissionSuccessPage from "@/app/edit-submission/success/page";

describe("EditSubmissionSuccessPage", () => {
  it("shows the submitted state without token or contact data", () => {
    const { container } = render(<EditSubmissionSuccessPage />);
    expect(screen.getByText("Changes submitted")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The DLTV team will review the updated tournament information.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to home" }),
    ).toHaveAttribute("href", "/");
    expect(container).not.toHaveTextContent(/[A-Za-z0-9_-]{43}/);
    expect(container).not.toHaveTextContent(/@/);
  });
});
