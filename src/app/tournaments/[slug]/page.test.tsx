import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-tournaments/load", () => ({
  loadPublicTournamentProjection: vi.fn(),
}));

import TournamentPage, {
  generateMetadata,
} from "@/app/tournaments/[slug]/page";
import { loadPublicTournamentProjection } from "@/lib/public-tournaments/load";
import { publicTournamentProjectionFixture } from "@/test/public-operational-fixture";

describe("TournamentPage navigation", () => {
  it("keeps catalog navigation active and offers contextual destinations", async () => {
    vi.mocked(loadPublicTournamentProjection).mockResolvedValue(
      publicTournamentProjectionFixture,
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

  it("marks hidden or missing tournament metadata as noindex", async () => {
    vi.mocked(loadPublicTournamentProjection).mockResolvedValue(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "hidden" }),
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
