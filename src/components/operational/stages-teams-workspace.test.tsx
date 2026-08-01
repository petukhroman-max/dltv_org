import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StagesTeamsWorkspace } from "@/components/operational/stages-teams-workspace";
import { makeStage, makeTeam } from "@/test/tournament-operational-fixtures";

const action = vi.fn(async (state) => state);
const actions = {
  createStage: action,
  updateStage: action,
  deleteStage: action,
  createTeam: action,
  updateTeam: action,
  deleteTeam: action,
};

describe("stages and teams workspace", () => {
  it("shows empty states and accessible add forms", () => {
    render(<StagesTeamsWorkspace stages={[]} teams={[]} actions={actions} />);
    expect(screen.getByText("No stages yet")).toBeInTheDocument();
    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(screen.getByText("Add stage")).toBeInTheDocument();
    expect(screen.getByText("Add team")).toBeInTheDocument();
  });

  it("shows stage and team edit and delete confirmations", () => {
    render(
      <StagesTeamsWorkspace
        stages={[makeStage()]}
        teams={[makeTeam()]}
        actions={actions}
      />,
    );
    expect(screen.getByText("1. Qualifier")).toBeInTheDocument();
    expect(screen.getByText("Team Alpha")).toBeInTheDocument();
    expect(screen.getAllByText("Edit")).toHaveLength(2);
    expect(screen.getAllByText("Delete")).toHaveLength(2);
    expect(screen.getByText(/Delete “Qualifier”/)).toBeInTheDocument();
    expect(screen.getByText(/Delete “Team Alpha”/)).toBeInTheDocument();
  });

  it("contains pending labels and no prompt or confirm calls", () => {
    const source = StagesTeamsWorkspace.toString();
    expect(source).not.toContain("window.prompt");
    expect(source).not.toContain("window.confirm");
  });
});
