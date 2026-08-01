import { unstable_noStore as noStore } from "next/cache";

import {
  addWorkspaceExistingPlayerAction,
  createWorkspacePlayerAndRosterAction,
  createWorkspaceStageAction,
  createWorkspaceTeamAction,
  deleteWorkspaceStageAction,
  deleteWorkspaceTeamAction,
  removeWorkspaceRosterAction,
  restoreWorkspaceRosterAction,
  searchWorkspacePlayersAction,
  updateWorkspacePlayerAction,
  updateWorkspaceRosterAction,
  updateWorkspaceStageAction,
  updateWorkspaceTeamAction,
} from "@/app/workspace/[token]/actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { StagesTeamsWorkspace } from "@/components/operational/stages-teams-workspace";
import { RosterWorkspace } from "@/components/operational/roster-workspace";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { listTeamRoster } from "@/lib/operational-workspace/roster.service";
import {
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrganizerWorkspacePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  noStore();
  const { token } = await params;
  const access = await validateWorkspaceAccess(token);
  if (!access) {
    return (
      <main className="adminMain workspaceInvalid">
        <section className="adminPanel">
          <h1>Tournament workspace</h1>
          <p>This workspace link is invalid or no longer available.</p>
        </section>
      </main>
    );
  }
  const context = {
    kind: "organizer_workspace" as const,
    submissionId: access.submission.id,
    tokenId: access.tokenId,
  };
  const [stages, teams, rosterMembers] = await Promise.all([
    listTournamentStages(access.submission.id),
    listTournamentTeams(access.submission.id),
    listTeamRoster(access.submission.id, context),
  ]);
  const actions = {
    createStage: createWorkspaceStageAction.bind(null, token),
    updateStage: updateWorkspaceStageAction.bind(null, token),
    deleteStage: deleteWorkspaceStageAction.bind(null, token),
    createTeam: createWorkspaceTeamAction.bind(null, token),
    updateTeam: updateWorkspaceTeamAction.bind(null, token),
    deleteTeam: deleteWorkspaceTeamAction.bind(null, token),
  };
  const rosterActions = {
    createPlayer: createWorkspacePlayerAndRosterAction.bind(null, token),
    addExisting: addWorkspaceExistingPlayerAction.bind(null, token),
    updatePlayer: updateWorkspacePlayerAction.bind(null, token),
    updateMembership: updateWorkspaceRosterAction.bind(null, token),
    remove: removeWorkspaceRosterAction.bind(null, token),
    restore: restoreWorkspaceRosterAction.bind(null, token),
    search: searchWorkspacePlayersAction.bind(null, token),
  };
  return (
    <main className="adminMain">
      <header className="adminPageHeader">
        <p className="eyebrow">Organizer workspace</p>
        <h1>{access.submission.tournament_name}</h1>
        <StatusBadge status={access.submission.status} />
        <p className="description">
          Manage the operational structure of your tournament.
        </p>
      </header>
      <section className="adminPanel" aria-labelledby="workspace-overview">
        <h2 id="workspace-overview">Overview</h2>
        <dl className="adminDefinitionGrid">
          <div className="adminDefinition">
            <dt>Region</dt>
            <dd>{access.submission.region}</dd>
          </div>
          <div className="adminDefinition">
            <dt>Dates</dt>
            <dd>
              {access.submission.start_date} — {access.submission.end_date}
            </dd>
          </div>
          <div className="adminDefinition">
            <dt>Timezone</dt>
            <dd>{access.submission.timezone}</dd>
          </div>
          <div className="adminDefinition">
            <dt>Format</dt>
            <dd>{access.submission.format ?? "Not set"}</dd>
          </div>
        </dl>
        <p className="adminWarning">
          Operational changes are saved immediately. Public tournament pages
          will support these data in a later release.
        </p>
      </section>
      <StagesTeamsWorkspace stages={stages} teams={teams} actions={actions} />
      <RosterWorkspace
        teams={teams}
        members={rosterMembers}
        actions={rosterActions}
      />
    </main>
  );
}
