import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicHeader } from "@/components/public/public-header";

describe("PublicHeader", () => {
  it("renders semantic public navigation and the home brand link", () => {
    render(<PublicHeader />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Public navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "DLTV Organizer Portal" }),
    ).toHaveAttribute("href", "/en");
    expect(
      screen.getByRole("link", { name: "Browse tournaments" }),
    ).toHaveAttribute("href", "/en/tournaments");
    expect(
      screen.getByRole("link", { name: "Submit a tournament" }),
    ).toHaveAttribute("href", "/en/submit-tournament");
    expect(
      screen.getByRole("link", { name: "EN", current: "page" }),
    ).toBeInTheDocument();
  });

  it.each([
    ["tournaments", "Browse tournaments"],
    ["submit", "Submit a tournament"],
  ] as const)("marks the %s section as current", (active, linkName) => {
    render(<PublicHeader active={active} />);

    expect(screen.getByRole("link", { name: linkName })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
