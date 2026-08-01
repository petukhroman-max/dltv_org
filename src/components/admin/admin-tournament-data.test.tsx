import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminTournamentData } from "@/components/admin/admin-tournament-data";
import {
  makeMatch,
  makeRoster,
  makeStage,
  makeTeam,
} from "@/test/tournament-operational-fixtures";

const emptyData = {
  stages: [],
  teams: [],
  rosters: [],
  matches: [],
  summary: {
    stages_count: 0,
    teams_count: 0,
    players_count: 0,
    matches_count: 0,
    scheduled_matches_count: 0,
    completed_matches_count: 0,
  },
};

describe("AdminTournamentData", () => {
  it("renders summary counts and explicit empty states without CRUD", () => {
    render(<AdminTournamentData {...emptyData} />);

    expect(
      screen.getByRole("heading", { name: "Tournament data" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No stages added.")).toBeInTheDocument();
    expect(screen.getByText("No teams added.")).toBeInTheDocument();
    expect(screen.getByText("No roster members added.")).toBeInTheDocument();
    expect(screen.getByText("No matches added.")).toBeInTheDocument();
    expect(screen.getAllByRole("definition")).toHaveLength(6);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders operational rows without private player names", () => {
    render(
      <AdminTournamentData
        stages={[makeStage()]}
        teams={[makeTeam()]}
        rosters={[makeRoster()]}
        matches={[makeMatch()]}
        summary={{
          stages_count: 1,
          teams_count: 1,
          players_count: 1,
          matches_count: 1,
          scheduled_matches_count: 1,
          completed_matches_count: 0,
        }}
      />,
    );

    expect(screen.getAllByText("Qualifier").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText("PlayerOne")).toBeInTheDocument();
    expect(screen.queryByText("Private Name")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps moderation mounted on the existing details page", () => {
    const pageSource = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "admin",
        "(protected)",
        "submissions",
        "[id]",
        "page.tsx",
      ),
      "utf8",
    );
    expect(pageSource).toContain("<AdminModerationPanel");
    expect(pageSource).toContain("<AdminTournamentData");
  });
});
