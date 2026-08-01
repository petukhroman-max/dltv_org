import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RosterWorkspace } from "@/components/operational/roster-workspace";
import { StagesTeamsWorkspace } from "@/components/operational/stages-teams-workspace";

const action = vi.fn(async (state) => state);

describe("operational screen localization", () => {
  it("renders Russian stage, team, and roster empty states without mixed headings", () => {
    render(
      <>
        <StagesTeamsWorkspace
          locale="ru"
          stages={[]}
          teams={[]}
          actions={{
            createStage: action,
            updateStage: action,
            deleteStage: action,
            createTeam: action,
            updateTeam: action,
            deleteTeam: action,
          }}
        />
        <RosterWorkspace
          locale="ru"
          teams={[]}
          members={[]}
          actions={{
            createPlayer: action,
            addExisting: action,
            updatePlayer: action,
            updateMembership: action,
            remove: action,
            restore: action,
            search: action,
          }}
        />
      </>,
    );
    expect(screen.getByRole("heading", { name: "Этапы" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Команды" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Составы" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Stages" })).toBeNull();
  });
});
