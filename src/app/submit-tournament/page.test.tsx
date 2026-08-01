import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/submit-tournament/actions", () => ({
  submitTournamentAction: vi.fn(),
}));

import SubmitTournamentPage from "@/app/submit-tournament/page";

describe("SubmitTournamentPage", () => {
  it("shows submit navigation and a direct catalog link", async () => {
    render(await SubmitTournamentPage());

    expect(
      screen.getByRole("link", {
        name: "Submit a tournament",
        current: "page",
      }),
    ).toHaveAttribute("href", "/en/submit-tournament");
    const browseLinks = screen.getAllByRole("link", {
      name: /Browse (published )?tournaments/,
    });
    expect(browseLinks.length).toBeGreaterThanOrEqual(2);
    expect(
      browseLinks.every(
        (link) => link.getAttribute("href") === "/en/tournaments",
      ),
    ).toBe(true);
    expect(screen.queryByRole("link", { name: /Back/i })).toBeNull();
  });
});
