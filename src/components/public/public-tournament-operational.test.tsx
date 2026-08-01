import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicTournamentOperational } from "@/components/public/public-tournament-operational";
import { formatMatchDuration } from "@/components/public/public-tournament-operational";
import { publicTournamentProjectionFixture } from "@/test/public-operational-fixture";

describe("PublicTournamentOperational", () => {
  it("renders public sections, active rosters, safe links, and TBD", () => {
    render(
      <PublicTournamentOperational
        projection={publicTournamentProjectionFixture}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Stages", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Matches", level: 2 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Teams", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ace/)).toBeInTheDocument();
    expect(screen.getByLabelText("To be determined")).toHaveTextContent("TBD");
    expect(screen.getByRole("link", { name: "Watch stream" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });

  it("localizes section and TBD accessibility labels for Russian", () => {
    render(
      <PublicTournamentOperational
        projection={{ ...publicTournamentProjectionFixture, locale: "ru" }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Этапы", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Будет определено")).toBeInTheDocument();
  });

  it("renders exact public empty states without internal terminology", () => {
    render(
      <PublicTournamentOperational
        projection={{
          ...publicTournamentProjectionFixture,
          stages: [],
          teams: [],
          matches: { live: [], upcoming: [], results: [], unscheduled: [] },
        }}
      />,
    );
    expect(
      screen.getByText("Tournament stages have not been published yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The match schedule has not been published yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Participating teams have not been published yet."),
    ).toBeInTheDocument();
  });

  it("groups roster roles, omits empty groups, and localizes duration", () => {
    const team = publicTournamentProjectionFixture.teams[0];
    render(
      <PublicTournamentOperational
        projection={{
          ...publicTournamentProjectionFixture,
          teams: [
            {
              ...team,
              roster: [
                ...team.roster,
                {
                  display_name: "Player",
                  country_code: null,
                  role: "player",
                  is_captain: false,
                },
                {
                  display_name: "Sub",
                  country_code: null,
                  role: "substitute",
                  is_captain: false,
                },
                {
                  display_name: "Coach",
                  country_code: null,
                  role: "coach",
                  is_captain: false,
                },
                {
                  display_name: "Manager",
                  country_code: null,
                  role: "manager",
                  is_captain: false,
                },
              ],
            },
          ],
        }}
      />,
    );
    for (const heading of [
      "Captain",
      "Players",
      "Substitutes",
      "Coaches",
      "Managers",
    ])
      expect(
        screen.getByRole("heading", { name: heading }),
      ).toBeInTheDocument();
    expect(formatMatchDuration(4320, "en")).toBe("1h 12m");
    expect(formatMatchDuration(2700, "ru")).toBe("45 мин");
  });

  it("renders localized stage values, status groups, secure VOD, and logo fallback", () => {
    const upcoming = publicTournamentProjectionFixture.matches.upcoming[0];
    render(
      <PublicTournamentOperational
        projection={{
          ...publicTournamentProjectionFixture,
          locale: "ru",
          stages: [
            {
              ...publicTournamentProjectionFixture.stages[0],
              stage_type: "double_elimination",
              status: "completed",
              format_text: null,
              location_name: null,
            },
          ],
          matches: {
            live: [{ ...upcoming, public_id: "Live match", status: "live" }],
            upcoming: [
              {
                ...upcoming,
                public_id: "Postponed match",
                status: "postponed",
              },
              {
                ...upcoming,
                public_id: "Cancelled match",
                status: "cancelled",
              },
            ],
            results: [
              {
                ...upcoming,
                public_id: "Walkover match",
                status: "walkover",
                stream_url: null,
                vod_url: "https://example.com/vod",
                duration_seconds: 4320,
              },
            ],
            unscheduled: [],
          },
        }}
      />,
    );
    expect(screen.getByText("Двойное выбывание")).toBeInTheDocument();
    expect(screen.getByText("Завершён")).toBeInTheDocument();
    expect(screen.getAllByText("Идёт сейчас").length).toBeGreaterThan(0);
    expect(screen.getByText("Перенесён")).toBeInTheDocument();
    expect(screen.getByText("Отменён")).toBeInTheDocument();
    expect(screen.getByText("Техническая победа")).toBeInTheDocument();
    expect(screen.getByText("1 ч 12 мин")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Смотреть запись" }),
    ).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getAllByText("RAD").length).toBeGreaterThan(0);
    expect(screen.getByText("Состав пока не опубликован.")).toBeInTheDocument();
  });
});
