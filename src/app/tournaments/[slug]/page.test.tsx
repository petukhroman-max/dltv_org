import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-tournaments/load", () => ({
  loadPublishedTournament: vi.fn(),
}));

import TournamentPage from "@/app/tournaments/[slug]/page";
import { loadPublishedTournament } from "@/lib/public-tournaments/load";
import { publishedTournamentFixture } from "@/test/public-tournament-fixture";

describe("TournamentPage navigation", () => {
  it("keeps catalog navigation active and offers contextual destinations", async () => {
    vi.mocked(loadPublishedTournament).mockResolvedValue(
      publishedTournamentFixture,
    );

    render(await TournamentPage({ params: Promise.resolve({ slug: "test" }) }));

    expect(
      screen.getByRole("link", {
        name: "Browse tournaments",
        current: "page",
      }),
    ).toHaveAttribute("href", "/en/tournaments");
    expect(
      screen.getByRole("link", { name: "← All tournaments" }),
    ).toHaveAttribute("href", "/en/tournaments");
    expect(
      screen
        .getAllByRole("link", { name: "Submit a tournament" })
        .every((link) => link.getAttribute("href") === "/en/submit-tournament"),
    ).toBe(true);
  });
});
