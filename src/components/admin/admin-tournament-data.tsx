import { formatAdminDateTime } from "@/lib/admin/presentation";
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
}: AdminTournamentDataProps) {
  return (
    <section className="adminPanel" aria-labelledby="tournament-data-heading">
      <div className="adminPanelHeading">
        <div>
          <h2 id="tournament-data-heading">Tournament data</h2>
          <p className="supportingText">
            Operational data model ready. Editing will be added in the next
            step.
          </p>
        </div>
      </div>

      <dl className="operationalSummary" aria-label="Operational summary">
        <div>
          <dt>Stages</dt>
          <dd>{summary.stages_count}</dd>
        </div>
        <div>
          <dt>Teams</dt>
          <dd>{summary.teams_count}</dd>
        </div>
        <div>
          <dt>Players</dt>
          <dd>{summary.players_count}</dd>
        </div>
        <div>
          <dt>Matches</dt>
          <dd>{summary.matches_count}</dd>
        </div>
        <div>
          <dt>Scheduled</dt>
          <dd>{summary.scheduled_matches_count}</dd>
        </div>
        <div>
          <dt>Completed</dt>
          <dd>{summary.completed_matches_count}</dd>
        </div>
      </dl>

      <div className="operationalSections">
        <section aria-labelledby="stages-heading">
          <h3 id="stages-heading">Stages</h3>
          {stages.length === 0 ? (
            <EmptyState>No stages added.</EmptyState>
          ) : (
            <div className="adminTableScroll">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Sequence</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
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

        <section aria-labelledby="teams-heading">
          <h3 id="teams-heading">Teams</h3>
          {teams.length === 0 ? (
            <EmptyState>No teams added.</EmptyState>
          ) : (
            <div className="adminTableScroll">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Seed</th>
                    <th>Name</th>
                    <th>Region</th>
                    <th>Status</th>
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

        <section aria-labelledby="rosters-heading">
          <h3 id="rosters-heading">Rosters</h3>
          {rosters.length === 0 ? (
            <EmptyState>No roster members added.</EmptyState>
          ) : (
            <div className="adminTableScroll">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Player</th>
                    <th>Role</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rosters.map((member) => (
                    <tr key={member.id}>
                      <td>{member.team.name}</td>
                      <th scope="row">{member.player.display_name}</th>
                      <td>{member.role}</td>
                      <td>{member.is_active ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="matches-heading">
          <h3 id="matches-heading">Matches</h3>
          {matches.length === 0 ? (
            <EmptyState>No matches added.</EmptyState>
          ) : (
            <div className="adminTableScroll">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>Match</th>
                    <th>Stage</th>
                    <th>Teams</th>
                    <th>Score</th>
                    <th>Scheduled</th>
                    <th>Status</th>
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
                      <td>{formatAdminDateTime(match.scheduled_at)}</td>
                      <td>{match.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
