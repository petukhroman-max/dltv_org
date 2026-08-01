import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OrganizerShell } from "@/components/ui/organizer-shell";
import { getDictionary } from "@/i18n/get-dictionary";

describe("OrganizerShell", () => {
  it("provides localized desktop and mobile navigation with active state", () => {
    render(
      <OrganizerShell
        locale="ru"
        dictionary={getDictionary("ru")}
        tournamentName="DLTV Cup"
      >
        <main>Content</main>
      </OrganizerShell>,
    );

    const overviewLinks = screen.getAllByRole("link", { name: "Обзор" });
    const teamsLinks = screen.getAllByRole("link", { name: "Команды" });

    expect(overviewLinks).toHaveLength(2);
    expect(overviewLinks[0]).toHaveAttribute("aria-current", "page");
    expect(teamsLinks[0]).not.toHaveAttribute("aria-current");

    fireEvent.click(teamsLinks[0]);

    expect(teamsLinks[0]).toHaveAttribute("aria-current", "page");
    expect(overviewLinks[0]).not.toHaveAttribute("aria-current");
    expect(screen.getByText("DLTV Cup")).toBeInTheDocument();
  });
});
