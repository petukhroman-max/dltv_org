import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TournamentCard } from "@/components/public/tournament-card";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("TournamentCard", () => {
  it("renders public card fields and an accessible detail link", () => {
    render(
      <TournamentCard
        tournament={publishedTournamentFixture}
        today="2026-08-10"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "DLTV Cup" }),
    ).toBeInTheDocument();
    expect(screen.getByText("By Deadlock One")).toBeInTheDocument();
    expect(screen.getByText("ongoing")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View tournament" }),
    ).toHaveAttribute("href", "/tournaments/dltv-cup");
    expect(screen.queryByText(/@/)).toBeNull();
  });
});
