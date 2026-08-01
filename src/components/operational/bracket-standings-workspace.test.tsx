import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  BracketWorkspace,
  StandingsWorkspace,
} from "@/components/operational/bracket-standings-workspace";

const action = vi.fn(async () => ({
  status: "success" as const,
  message: "Saved.",
  fieldErrors: {},
}));
const teams = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Radiant", seed: 1 },
  { id: "22222222-2222-4222-8222-222222222222", name: "Dire", seed: 2 },
];

describe("bracket and standings workspace", () => {
  it("keeps bracket actions callable and renders a mobile-compatible round list", () => {
    render(
      <BracketWorkspace
        stage={{
          id: "33333333-3333-4333-8333-333333333333",
          name: "Playoffs",
          stage_type: "double_elimination",
          bracket_type: "double_elimination",
        }}
        matches={[
          {
            id: "44444444-4444-4444-8444-444444444444",
            match_number: 1,
            round_name: "Upper R1",
            bracket_section: "winners",
            bracket_round: 1,
            bracket_position: 1,
            team_a_id: teams[0].id,
            team_b_id: teams[1].id,
            score_a: null,
            score_b: null,
            status: "scheduled",
            updated_at: "2026-08-02T00:00:00.000Z",
          },
        ]}
        links={[]}
        teams={teams}
        positionAction={action}
        linkAction={action}
        unlinkAction={action}
        locale="en"
      />,
    );
    expect(
      screen.getByRole("region", { name: "Playoffs bracket" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save position" })).toBeEnabled();
    expect(screen.getByLabelText("Bracket type")).toHaveValue(
      "double_elimination",
    );
  });

  it("shows zero-match standings rows and auditable adjustments", () => {
    render(
      <StandingsWorkspace
        stage={{ id: "33333333-3333-4333-8333-333333333333", name: "Groups" }}
        config={null}
        groups={[]}
        adjustments={[]}
        standings={[
          {
            team_id: teams[0].id,
            team_name: "Radiant",
            played: 0,
            wins: 0,
            losses: 0,
            score_for: 0,
            score_against: 0,
            score_diff: 0,
            points: 0,
            rank: 1,
            qualified: true,
          },
        ]}
        teams={teams}
        configAction={action}
        groupAction={action}
        removeGroupAction={action}
        adjustmentAction={action}
        deleteAdjustmentAction={action}
        locale="en"
      />,
    );
    expect(
      screen.getByRole("rowheader", { name: "Radiant" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save adjustment" }),
    ).toBeEnabled();
  });
});
