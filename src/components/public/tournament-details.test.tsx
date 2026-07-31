import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TournamentDetails } from "@/components/public/tournament-details";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("TournamentDetails", () => {
  it("renders safe projection fields and provenance", () => {
    render(
      <TournamentDetails
        tournament={publishedTournamentFixture}
        today="2026-08-01"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "DLTV Cup" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Information provided by the tournament organizer/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/reviewer/i)).toBeNull();
    expect(screen.queryByText(/contact/i)).toBeNull();
  });

  it("uses safe external-link attributes and suppresses unsafe protocols", () => {
    const { rerender } = render(
      <TournamentDetails
        tournament={publishedTournamentFixture}
        today="2026-08-01"
      />,
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getByRole("link", { name: "Register" })).toHaveAttribute(
      "target",
      "_blank",
    );
    rerender(
      <TournamentDetails
        tournament={{
          ...publishedTournamentFixture,
          registration_url: "javascript:alert(1)",
        }}
        today="2026-08-01"
      />,
    );
    expect(screen.queryByRole("link", { name: "Register" })).toBeNull();
  });
});
