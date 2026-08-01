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
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { OrganizerShell } from "@/components/ui/organizer-shell";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
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
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const { token } = await params;
  const access = await validateWorkspaceAccess(token);
  if (!access) {
    return (
      <main className="adminMain workspaceInvalid">
        <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
        <section className="adminPanel">
          <h1>{dictionary.workspace.invalidTitle}</h1>
          <p>{dictionary.workspace.invalidDescription}</p>
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
  const activeRoster = rosterMembers.filter((member) => member.is_active);
  const teamsWithRoster = new Set(
    activeRoster.map((member) => member.tournament_team_id),
  );
  const nextActions = [
    stages.length === 0
      ? [dictionary.workspace.addFirstStage, "#workspace-stages"]
      : null,
    teams.length === 0
      ? [dictionary.workspace.addTeams, "#workspace-teams"]
      : null,
    teams.length > teamsWithRoster.size
      ? [dictionary.workspace.completeRosters, "#workspace-rosters"]
      : null,
  ].filter((item): item is [string, string] => item !== null);
  return (
    <OrganizerShell
      locale={locale}
      dictionary={dictionary}
      tournamentName={access.submission.tournament_name}
    >
      <main className="workspaceMain">
        <Breadcrumbs
          locale={locale}
          label={dictionary.a11y.breadcrumbs}
          items={[{ label: access.submission.tournament_name }]}
        />
        <header className="workspacePageHeader">
          <div>
            <p className="eyebrow">{dictionary.workspace.eyebrow}</p>
            <h1>{access.submission.tournament_name}</h1>
            <p className="description">{dictionary.workspace.description}</p>
          </div>
          <StatusBadge status={access.submission.status} locale={locale} />
        </header>
        <section
          className="adminPanel"
          id="overview"
          aria-labelledby="workspace-overview"
        >
          <h2 id="workspace-overview">{dictionary.workspace.overview}</h2>
          <dl
            className="operationalSummary"
            aria-label={dictionary.workspace.overview}
          >
            <div>
              <dt>{dictionary.workspace.stagesCount}</dt>
              <dd>{stages.length}</dd>
            </div>
            <div>
              <dt>{dictionary.workspace.teamsCount}</dt>
              <dd>{teams.length}</dd>
            </div>
            <div>
              <dt>{dictionary.workspace.rosterCount}</dt>
              <dd>{activeRoster.length}</dd>
            </div>
            <div>
              <dt>{dictionary.workspace.emptyTeams}</dt>
              <dd>{teams.length - teamsWithRoster.size}</dd>
            </div>
            <div>
              <dt>{dictionary.workspace.status}</dt>
              <dd>
                <StatusBadge
                  status={access.submission.status}
                  locale={locale}
                />
              </dd>
            </div>
          </dl>
          <dl className="adminDefinitionGrid">
            <div className="adminDefinition">
              <dt>{dictionary.workspace.region}</dt>
              <dd>{access.submission.region}</dd>
            </div>
            <div className="adminDefinition">
              <dt>{dictionary.workspace.dates}</dt>
              <dd>
                {access.submission.start_date} — {access.submission.end_date}
              </dd>
            </div>
            <div className="adminDefinition">
              <dt>{dictionary.workspace.timezone}</dt>
              <dd>{access.submission.timezone}</dd>
            </div>
            <div className="adminDefinition">
              <dt>{dictionary.workspace.format}</dt>
              <dd>{access.submission.format ?? dictionary.common.notSet}</dd>
            </div>
          </dl>
          {nextActions.length ? (
            <div className="nextActions">
              <h3>{dictionary.workspace.nextActions}</h3>
              <ul>
                {nextActions.map(([label, href]) => (
                  <li key={href}>
                    <a href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="adminWarning">
            {dictionary.workspace.savedImmediately}
          </p>
        </section>
        <StagesTeamsWorkspace
          stages={stages}
          teams={teams}
          actions={actions}
          locale={locale}
        />
        <RosterWorkspace
          teams={teams}
          members={rosterMembers}
          actions={rosterActions}
          locale={locale}
        />
      </main>
    </OrganizerShell>
  );
}
