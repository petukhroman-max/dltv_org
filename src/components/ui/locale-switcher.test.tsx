import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/en/workspace/secret-token/teams/team-123",
  search: new URLSearchParams("view=roster"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.search,
}));

import { LocaleSwitcher } from "@/components/ui/locale-switcher";

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    navigation.pathname = "/en/workspace/secret-token/teams/team-123";
    navigation.search = new URLSearchParams("view=roster");
    window.history.replaceState({}, "", "/en/workspace");
  });

  it("preserves route, dynamic parameters, token, and query", () => {
    render(<LocaleSwitcher locale="en" label="Language" />);
    expect(screen.getByRole("link", { name: "EN" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "RU" })).toHaveAttribute(
      "href",
      "/ru/workspace/secret-token/teams/team-123?view=roster",
    );
  });

  it("preserves the active section anchor", async () => {
    navigation.pathname = "/en/tournaments/dltv-cup";
    navigation.search = new URLSearchParams();
    window.history.replaceState({}, "", "/en/tournaments/dltv-cup#matches");
    render(<LocaleSwitcher locale="en" label="Language" />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "RU" })).toHaveAttribute(
        "href",
        "/ru/tournaments/dltv-cup#matches",
      ),
    );
  });
});
