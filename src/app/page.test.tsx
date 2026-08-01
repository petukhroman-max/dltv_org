import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/public-tournaments/public-tournaments.repository", () => ({
  listPublishedTournaments: vi.fn().mockResolvedValue({
    tournaments: [],
    total: 0,
    page: 1,
    limit: 3,
    totalPages: 1,
  }),
}));

import Home from "@/app/page";

describe("Home", () => {
  it("links to the public tournament submission flow", async () => {
    render(await Home());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Run and publish your Deadlock tournament in one place.",
    );
    expect(
      screen.getAllByRole("link", { name: "Submit a tournament" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: "Browse tournaments" }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: "EN", current: "page" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "From submission to a public tournament page",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Built for tournament operations, not busywork",
      }),
    ).toBeInTheDocument();
  });
});
