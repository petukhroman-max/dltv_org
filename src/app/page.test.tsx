import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  it("links to the public tournament submission flow", () => {
    render(<Home />);

    expect(screen.getByRole("heading")).toHaveTextContent(
      "Bring your tournament to the Deadlock community.",
    );
    expect(
      screen.getByRole("link", { name: "Submit a tournament" }),
    ).toHaveAttribute("href", "/submit-tournament");
  });
});
