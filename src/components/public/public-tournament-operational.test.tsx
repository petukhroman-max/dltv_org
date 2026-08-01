import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicTournamentOperational } from "@/components/public/public-tournament-operational";
import { publicTournamentProjectionFixture } from "@/test/public-operational-fixture";

describe("PublicTournamentOperational", () => {
  it("renders public sections, active rosters, safe links, and TBD", () => {
    render(
      <PublicTournamentOperational
        projection={publicTournamentProjectionFixture}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Stages", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Matches", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Teams", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ace/)).toBeInTheDocument();
    expect(screen.getByLabelText("To be determined")).toHaveTextContent("TBD");
    expect(screen.getByRole("link", { name: "Watch stream" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("localizes section and TBD accessibility labels for Russian", () => {
    render(
      <PublicTournamentOperational
        projection={{ ...publicTournamentProjectionFixture, locale: "ru" }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Этапы", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Будет определено")).toBeInTheDocument();
  });
});
