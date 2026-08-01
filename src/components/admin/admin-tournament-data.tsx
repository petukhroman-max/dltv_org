import { formatAdminDateTime } from "@/lib/admin/presentation";
import type { Locale } from "@/i18n/config";
import type { AdminTournamentMatch } from "@/lib/domain/tournament-match";
import type { AdminTournamentRosterMember } from "@/lib/domain/tournament-roster";
import type { AdminTournamentStage } from "@/lib/domain/tournament-stage";
import type { AdminTournamentTeam } from "@/lib/domain/tournament-team";
import type { TournamentOperationalSummary } from "@/lib/repositories/tournament-operational-data";

export type AdminTournamentDataProps = {
  stages: AdminTournamentStage[];
  teams: AdminTournamentTeam[];
  rosters: AdminTournamentRosterMember[];
  matches: AdminTournamentMatch[];
  summary: TournamentOperationalSummary;
  showStagesAndTeams?: boolean;
  showRosters?: boolean;
  showMatches?: boolean;
  locale?: Locale;
};

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="adminEmpty">{children}</p>;
}

export function AdminTournamentData({
  stages,
  teams,
  rosters,
  matches,
  summary,
  showStagesAndTeams = true,
  showRosters = true,
  showMatches = true,
  locale = "en",
}: AdminTournamentDataProps) {
  const t = (en: string, ru: string) => (locale === "ru" ? ru : en);
  return (
    <section
      id="tournament-data"
      className="adminPanel"
      aria-labelledby="tournament-data-heading"
    >
      <div className="adminPanelHeading">
        <div>
          <h2 id="tournament-data-heading">
            {t("Tournament data", "Данные турнира")}
          </h2>
          <p className="supportingText">
            {t(
              "Review operational structure and current counts.",
              "Проверяйте структуру турнира и текущие показатели.",
            )}
          </p>
        </div>
      </div>

      <dl className="operationalSummary" aria-label="Operational summary">
        <div>
          <dt>{t("Stages", "Этапы")}</dt>
          <dd>{summary.stages_count}</dd>
        </div>
        <div>
          <dt>{t("Teams", "Команды")}</dt>
          <dd>{summary.teams_count}</dd>
        </div>
        <div>
          <dt>{t("Players", "Игроки")}</dt>
          <dd>{summary.players_count}</dd>
        </div>
        <div>
          <dt>{t("Matches", "Матчи")}</dt>
          <dd>{summary.matches_count}</dd>
        </div>
        <div>
          <dt>{t("Scheduled", "Запланировано")}</dt>
          <dd>{summary.scheduled_matches_count}</dd>
        </div>
        <div>
          <dt>{t("Completed", "Завершено")}</dt>
          <dd>{summary.completed_matches_count}</dd>
        </div>
      </dl>

      <div className="operationalSections">
        {showStagesAndTeams ? (
          <section aria-labelledby="stages-heading">
            <h3 id="stages-heading">{t("Stages", "Этапы")}</h3>
            {stages.length === 0 ? (
              <EmptyState>
                {t("No stages added.", "Этапов пока нет.")}
              </EmptyState>
            ) : (
              <div className="adminTableScroll">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>{t("Sequence", "Порядок")}</th>
                      <th>{t("Name", "Название")}</th>
                      <th>{t("Type", "Тип")}</th>
                      <th>{t("Status", "Статус")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage) => (
                      <tr key={stage.id}>
                        <td>{stage.sequence_number}</td>
                        <th scope="row">{stage.name}</th>
                        <td>{stage.stage_type}</td>
                        <td>{stage.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {showStagesAndTeams ? (
          <section aria-labelledby="teams-heading">
            <h3 id="teams-heading">{t("Teams", "Команды")}</h3>
            {teams.length === 0 ? (
              <EmptyState>
                {t("No teams added.", "Команд пока нет.")}
              </EmptyState>
            ) : (
              <div className="adminTableScroll">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>{t("Seed", "Посев")}</th>
                      <th>{t("Name", "Название")}</th>
                      <th>{t("Region", "Регион")}</th>
                      <th>{t("Status", "Статус")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => (
                      <tr key={team.id}>
                        <td>{team.seed ?? "—"}</td>
                        <th scope="row">{team.name}</th>
                        <td>{team.region ?? "—"}</td>
                        <td>{team.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {showRosters ? (
          <section aria-labelledby="rosters-heading">
            <h3 id="rosters-heading">{t("Rosters", "Составы")}</h3>
            {rosters.length === 0 ? (
              <EmptyState>
                {t("No roster members added.", "Участников состава пока нет.")}
              </EmptyState>
            ) : (
              <div className="adminTableScroll">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>{t("Team", "Команда")}</th>
                      <th>{t("Player", "Игрок")}</th>
                      <th>{t("Role", "Роль")}</th>
                      <th>{t("Active", "Активен")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosters.map((member) => (
                      <tr key={member.id}>
                        <td>{member.team.name}</td>
                        <th scope="row">{member.player.display_name}</th>
                        <td>{member.role}</td>
                        <td>
                          {member.is_active ? t("Yes", "Да") : t("No", "Нет")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {showMatches ? (
          <section aria-labelledby="matches-heading">
            <h3 id="matches-heading">{t("Matches", "Матчи")}</h3>
            {matches.length === 0 ? (
              <EmptyState>
                {t("No matches added.", "Матчей пока нет.")}
              </EmptyState>
            ) : (
              <div className="adminTableScroll">
                <table className="adminTable">
                  <thead>
                    <tr>
                      <th>{t("Match", "Матч")}</th>
                      <th>{t("Stage", "Этап")}</th>
                      <th>{t("Teams", "Команды")}</th>
                      <th>{t("Score", "Счёт")}</th>
                      <th>{t("Scheduled", "Время")}</th>
                      <th>{t("Status", "Статус")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match.id}>
                        <th scope="row">{match.match_number ?? "—"}</th>
                        <td>{match.stage?.name ?? "—"}</td>
                        <td>
                          {match.team_a?.name ?? "TBD"} vs{" "}
                          {match.team_b?.name ?? "TBD"}
                        </td>
                        <td>
                          {match.score_a ?? "—"} : {match.score_b ?? "—"}
                        </td>
                        <td>
                          {formatAdminDateTime(match.scheduled_at, locale)}
                        </td>
                        <td>{match.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}
      </div>
    </section>
  );
}
