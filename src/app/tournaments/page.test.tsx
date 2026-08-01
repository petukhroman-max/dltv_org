import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-tournaments/public-tournaments.repository", () => ({
  listPublishedTournaments: vi.fn(),
}));

import TournamentsPage from "@/app/tournaments/page";
import { listPublishedTournaments } from "@/lib/public-tournaments/public-tournaments.repository";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("TournamentsPage", () => {
  it("renders catalog cards and labeled filters", async () => {
    vi.mocked(listPublishedTournaments).mockResolvedValue({
      tournaments: [publishedTournamentFixture],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    render(await TournamentsPage({ searchParams: Promise.resolve({}) }));
    expect(
      screen.getByRole("heading", { name: "Deadlock tournaments" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Region")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Browse tournaments",
        current: "page",
      }),
    ).toHaveAttribute("href", "/en/tournaments");
    expect(
      screen.getAllByRole("link", { name: "Submit a tournament" }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "View tournament" }),
    ).toBeInTheDocument();
  });

  it("renders the required empty state", async () => {
    vi.mocked(listPublishedTournaments).mockResolvedValue({
      tournaments: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
    render(await TournamentsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText("No published tournaments")).toBeInTheDocument();
  });

  it("does not expose database details on failure", async () => {
    vi.mocked(listPublishedTournaments).mockRejectedValue(
      new Error("relation secret"),
    );
    render(await TournamentsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "temporarily unavailable",
    );
    expect(screen.queryByText(/relation secret/)).toBeNull();
  });
});
