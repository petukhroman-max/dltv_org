import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RosterWorkspace } from "@/components/operational/roster-workspace";
import { makeTeam } from "@/test/tournament-operational-fixtures";

const action = vi.fn();
const actions = {
  createPlayer: action,
  addExisting: action,
  updatePlayer: action,
  updateMembership: action,
  remove: action,
  restore: action,
  search: action,
};

describe("RosterWorkspace", () => {
  it("renders team roster controls and no private real-name field", () => {
    const { container } = render(
      <RosterWorkspace teams={[makeTeam()]} members={[]} actions={actions} />,
    );
    expect(
      screen.getByRole("heading", { name: "Rosters" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Create player and add to roster"),
    ).toBeInTheDocument();
    expect(screen.getByText("Find existing player")).toBeInTheDocument();
    expect(container.querySelector('[name="real_name"]')).toBeNull();
  });
});
