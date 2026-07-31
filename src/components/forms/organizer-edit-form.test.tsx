import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/edit-submission/[token]/actions", () => ({
  resubmitTournamentAction: vi.fn(),
}));

import { OrganizerEditForm } from "@/components/forms/organizer-edit-form";
import type { EditableSubmission } from "@/lib/organizer-edit/organizer-edit.types";

const submission: EditableSubmission = {
  id: "b1f0a925-b6f0-43ab-8e63-a7280fe7a870",
  tournament_name: "DLTV Cup",
  description: "Original description",
  region: "EU",
  language: "English",
  start_date: "2026-08-10",
  end_date: "2026-08-12",
  timezone: "Europe/Berlin",
  format: "Single elimination",
  prize_pool_text: "$1,000",
  registration_url: "https://example.com/register",
  bracket_url: null,
  discord_url: null,
  stream_url: null,
  rules_url: null,
  is_online: true,
  max_teams: 16,
  registration_deadline: null,
  organizer_notes: null,
  reviewer_notes: "Please update the dates.",
};

describe("OrganizerEditForm", () => {
  it("prefills editable fields and shows reviewer guidance read-only", () => {
    render(
      <OrganizerEditForm token={"A".repeat(43)} submission={submission} />,
    );
    expect(screen.getByLabelText(/Tournament name/)).toHaveValue("DLTV Cup");
    expect(screen.getByText("Please update the dates.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resubmit tournament" }),
    ).toBeInTheDocument();
  });

  it("does not expose organizer identity, contact, status, or reviewer controls", () => {
    render(
      <OrganizerEditForm token={"A".repeat(43)} submission={submission} />,
    );
    expect(screen.queryByLabelText(/contact email/i)).toBeNull();
    expect(screen.queryByLabelText(/organization name/i)).toBeNull();
    expect(screen.queryByLabelText(/^status/i)).toBeNull();
    expect(screen.queryByLabelText(/reviewer note/i)).toBeNull();
    expect(screen.queryByText(/consent to publish/i)).toBeNull();
  });
});
