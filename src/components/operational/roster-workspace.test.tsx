import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RosterWorkspace } from "@/components/operational/roster-workspace";
import {
  makeTeam,
  playerId,
  teamAId,
} from "@/test/tournament-operational-fixtures";

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
    expect(
      screen.getByText(
        /create a different player even if the same display name exists/i,
      ),
    ).toBeInTheDocument();
  });

  it("groups active roles, marks the captain, and exposes edit/remove controls", () => {
    render(
      <RosterWorkspace
        teams={[makeTeam()]}
        members={[
          {
            id: "d72ca353-10d5-468a-aabb-81a239fbe78f",
            tournament_team_id: teamAId,
            player_id: playerId,
            role: "player",
            is_captain: true,
            is_active: true,
            joined_at: null,
            left_at: null,
            updated_at: "2026-08-01T00:00:00Z",
            player: {
              id: playerId,
              display_name: "Ace",
              country_code: null,
              steam_id: null,
              deadlock_account_id: null,
              updated_at: "2026-08-01T00:00:00Z",
            },
          },
        ]}
        actions={actions}
      />,
    );
    expect(screen.getByRole("heading", { name: "Player" })).toBeInTheDocument();
    expect(screen.getByText("Ace · Captain")).toBeInTheDocument();
    expect(screen.getByText("Edit player profile")).toBeInTheDocument();
    expect(screen.getByText("Edit membership")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Remove from roster" }),
    ).toHaveLength(1);
  });

  it("shows former members with a restore action and never restores captain in the form", () => {
    const { container } = render(
      <RosterWorkspace
        teams={[makeTeam()]}
        members={[
          {
            id: "d72ca353-10d5-468a-aabb-81a239fbe78f",
            tournament_team_id: teamAId,
            player_id: playerId,
            role: "coach",
            is_captain: false,
            is_active: false,
            joined_at: "2026-08-01T00:00:00Z",
            left_at: "2026-08-02T00:00:00Z",
            updated_at: "2026-08-02T00:00:00Z",
            player: {
              id: playerId,
              display_name: "Coach Ace",
              country_code: null,
              steam_id: null,
              deadlock_account_id: null,
              updated_at: "2026-08-01T00:00:00Z",
            },
          },
        ]}
        actions={actions}
      />,
    );
    expect(screen.getByText("Former members (1)")).toBeInTheDocument();
    expect(screen.getByText("Restore")).toBeInTheDocument();
    const restoreForm = screen.getByText("Restore").closest("form");
    expect(restoreForm).not.toBeNull();
    expect(restoreForm?.querySelector('[name="is_captain"]')).toBeNull();
    expect(container.querySelector('[name="real_name"]')).toBeNull();
  });
});
