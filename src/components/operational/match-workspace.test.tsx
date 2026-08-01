import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  MatchCreateForm,
  MatchDetailPanel,
  MatchList,
  type MatchActions,
} from "@/components/operational/match-workspace";
import {
  makeMatch,
  makeStage,
  makeTeam,
  teamBId,
} from "@/test/tournament-operational-fixtures";

const action = vi.fn(async () => ({
  status: "idle" as const,
  fieldErrors: {},
  values: {},
}));
const actions: MatchActions = {
  create: action,
  update: action,
  schedule: action,
  start: action,
  postpone: action,
  complete: action,
  walkover: action,
  cancel: action,
  reopen: action,
  remove: action,
};
const teams = [
  makeTeam(),
  makeTeam({ id: teamBId, name: "Team Beta", slug: "team-beta", seed: 2 }),
];

describe("match workspace", () => {
  it("renders localized create controls with real teams, TBD, and no source field", () => {
    const { container } = render(
      <MatchCreateForm
        stages={[makeStage()]}
        teams={teams}
        locale="ru"
        defaultTimezone="Europe/Berlin"
        action={action}
      />,
    );

    expect(screen.getByText("Создать матч")).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "TBD" })).toHaveLength(2);
    expect(screen.getAllByRole("option", { name: "Team Alpha" })).toHaveLength(
      2,
    );
    expect(container.querySelector('[name="source"]')).toBeNull();
    expect(container.querySelector('[name="winner_team_id"]')).toBeNull();
  });

  it("groups schedule rows by date and secures external stream links", () => {
    render(
      <MatchList
        matches={[makeMatch()]}
        locale="en"
        detailBasePath="/en/workspace/token/matches"
        view="schedule"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "August 10, 2026" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage match" })).toHaveAttribute(
      "href",
      `/en/workspace/token/matches/${makeMatch().id}`,
    );
    expect(screen.getByRole("link", { name: "Open stream" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("keeps result actions callable and protects destructive actions with confirmation", () => {
    render(
      <MatchDetailPanel
        match={makeMatch()}
        stages={[makeStage()]}
        teams={teams}
        locale="en"
        defaultTimezone="Europe/Berlin"
        actions={actions}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Start match" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enter result" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record walkover" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cancel match" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete match" }),
    ).toBeInTheDocument();
  });
});
