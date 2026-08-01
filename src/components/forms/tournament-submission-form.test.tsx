import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/submit-tournament/actions", () => ({
  submitTournamentAction: vi.fn(),
}));

import { TournamentSubmissionForm } from "@/components/forms/tournament-submission-form";
import { publicSubmissionCopy } from "@/lib/submissions/public-submission.copy";

describe("TournamentSubmissionForm", () => {
  it("renders required organizer and tournament fields", () => {
    render(<TournamentSubmissionForm renderedAt={Date.now()} />);

    expect(
      screen.getByRole("textbox", { name: /Organization name/ }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: /Contact person/ }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: /Contact email/ }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: /Tournament name/ }),
    ).toBeRequired();
    expect(screen.getByLabelText(/Region/)).toBeRequired();
    expect(screen.getByLabelText(/Start date/)).toBeRequired();
    expect(screen.getByLabelText(/End date/)).toBeRequired();
    expect(screen.getByLabelText(/Timezone/)).toBeRequired();
  });

  it("renders consent and the submit button", () => {
    render(<TournamentSubmissionForm renderedAt={Date.now()} />);

    expect(
      screen.getByRole("checkbox", {
        name: publicSubmissionCopy.form.consent,
      }),
    ).toBeRequired();
    expect(
      screen.getByRole("button", {
        name: publicSubmissionCopy.form.submit,
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", {
        name: publicSubmissionCopy.form.browse,
      }),
    ).toHaveAttribute("href", "/tournaments");
    expect(screen.queryByRole("link", { name: /Back/i })).toBeNull();
  });

  it("displays field and form errors while preserving entered values", () => {
    render(
      <TournamentSubmissionForm
        renderedAt={Date.now()}
        initialState={{
          status: "error",
          formError: publicSubmissionCopy.errors.generic,
          fieldErrors: {
            contact_email: publicSubmissionCopy.errors.invalid.contact_email,
          },
          values: {
            organization_name: "DLTV Events",
            contact_email: "invalid-email",
          },
        }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      publicSubmissionCopy.errors.generic,
    );
    expect(
      screen.getByText(publicSubmissionCopy.errors.invalid.contact_email),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization name/)).toHaveValue(
      "DLTV Events",
    );
    expect(screen.getByLabelText(/Contact email/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
