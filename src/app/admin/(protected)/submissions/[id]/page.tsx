import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminSubmissionDetails } from "@/components/admin/admin-submission-details";
import { AdminTournamentData } from "@/components/admin/admin-tournament-data";
import { AdminModerationPanel } from "@/components/admin/admin-moderation-panel";
import { AdminEditLinkPanel } from "@/components/admin/admin-edit-link-panel";
import { AdminWorkspaceLinkPanel } from "@/components/admin/admin-workspace-link-panel";
import { StagesTeamsWorkspace } from "@/components/operational/stages-teams-workspace";
import { RosterWorkspace } from "@/components/operational/roster-workspace";
import { StageStructureLinks } from "@/components/operational/stage-structure-links";
import {
  MatchCreateForm,
  MatchList,
  type MatchActions,
} from "@/components/operational/match-workspace";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  addAdminExistingPlayerAction,
  createAdminPlayerAndRosterAction,
  createAdminStageAction,
  createAdminTeamAction,
  deleteAdminStageAction,
  deleteAdminTeamAction,
  removeAdminRosterAction,
  restoreAdminRosterAction,
  searchAdminPlayersAction,
  updateAdminPlayerAction,
  updateAdminRosterAction,
  updateAdminStageAction,
  updateAdminTeamAction,
  cancelAdminMatchAction,
  completeAdminMatchAction,
  createAdminMatchAction,
  deleteAdminMatchAction,
  postponeAdminMatchAction,
  reopenAdminMatchAction,
  scheduleAdminMatchAction,
  startAdminMatchAction,
  updateAdminMatchAction,
  walkoverAdminMatchAction,
} from "@/app/admin/(protected)/submissions/[id]/operational-actions";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { getAdminCopy } from "@/lib/admin/copy";
import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTournamentSubmissionDetails } from "@/lib/repositories/submission-details";
import {
  getTournamentOperationalSummary,
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";
import { submissionStatusSchema } from "@/lib/domain/submission";
import { getSubmissionEditTokenStatus } from "@/lib/organizer-edit/organizer-edit.service";
import { getWorkspaceTokenStatus } from "@/lib/organizer-workspace/workspace-token.service";
import { listTeamRoster } from "@/lib/operational-workspace/roster.service";
import { listTournamentMatches } from "@/lib/operational-workspace/match.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSubmissionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const adminCopy = getAdminCopy(locale);
  const { id } = await params;
  const details = await loadAdminSubmissionDetails(
    id,
    getTournamentSubmissionDetails,
    notFound,
  );
  const status = submissionStatusSchema.safeParse(details.submission.status);
  const editTokenStatus =
    status.success && status.data === "needs_changes"
      ? await getSubmissionEditTokenStatus(details.submission.id)
      : null;
  const workspaceTokenStatus = await getWorkspaceTokenStatus(
    details.submission.id,
  );
  const identity = await requireAdmin();
  const [stages, teams, rosterMembers, matches, operationalSummary] =
    await Promise.all([
      listTournamentStages(details.submission.id),
      listTournamentTeams(details.submission.id),
      listTeamRoster(details.submission.id, { kind: "admin", identity }),
      listTournamentMatches(details.submission.id, {
        kind: "admin",
        identity,
      }),
      getTournamentOperationalSummary(details.submission.id),
    ]);
  const canManageOperationalData =
    status.success &&
    ["submitted", "needs_changes", "approved", "published"].includes(
      status.data,
    );
  const operationalActions = {
    createStage: createAdminStageAction.bind(null, details.submission.id),
    updateStage: updateAdminStageAction.bind(null, details.submission.id),
    deleteStage: deleteAdminStageAction.bind(null, details.submission.id),
    createTeam: createAdminTeamAction.bind(null, details.submission.id),
    updateTeam: updateAdminTeamAction.bind(null, details.submission.id),
    deleteTeam: deleteAdminTeamAction.bind(null, details.submission.id),
  };
  const rosterActions = {
    createPlayer: createAdminPlayerAndRosterAction.bind(
      null,
      details.submission.id,
    ),
    addExisting: addAdminExistingPlayerAction.bind(null, details.submission.id),
    updatePlayer: updateAdminPlayerAction.bind(null, details.submission.id),
    updateMembership: updateAdminRosterAction.bind(null, details.submission.id),
    remove: removeAdminRosterAction.bind(null, details.submission.id),
    restore: restoreAdminRosterAction.bind(null, details.submission.id),
    search: searchAdminPlayersAction.bind(null, details.submission.id),
  };
  const matchActions: MatchActions = {
    create: createAdminMatchAction.bind(null, details.submission.id),
    update: updateAdminMatchAction.bind(null, details.submission.id),
    schedule: scheduleAdminMatchAction.bind(null, details.submission.id),
    start: startAdminMatchAction.bind(null, details.submission.id),
    postpone: postponeAdminMatchAction.bind(null, details.submission.id),
    complete: completeAdminMatchAction.bind(null, details.submission.id),
    walkover: walkoverAdminMatchAction.bind(null, details.submission.id),
    cancel: cancelAdminMatchAction.bind(null, details.submission.id),
    reopen: reopenAdminMatchAction.bind(null, details.submission.id),
    remove: deleteAdminMatchAction.bind(null, details.submission.id),
  };

  return (
    <main className="adminMain">
      <Breadcrumbs
        locale={locale}
        label={dictionary.a11y.breadcrumbs}
        items={[
          { label: adminCopy.nav.submissions, href: "/admin/submissions" },
          { label: details.submission.tournament_name },
        ]}
      />
      <header className="adminPageHeader adminDetailsHeader">
        <p className="eyebrow">{adminCopy.list.eyebrow}</p>
        <h1>{details.submission.tournament_name}</h1>
        <p className="description">
          {dictionary.admin.reference}: <code>{details.submission.id}</code>
        </p>
      </header>
      <nav
        className="adminSectionTabs"
        aria-label={dictionary.a11y.adminSections}
      >
        <a href="#overview">{dictionary.nav.overview}</a>
        <a href="#moderation">{dictionary.nav.moderation}</a>
        <a href="#tournament-data">{dictionary.nav.tournamentData}</a>
        <a href="#access">{dictionary.nav.access}</a>
        <a href="#history">{dictionary.nav.history}</a>
      </nav>
      <div className="adminDetails">
        {status.success ? (
          <div id="moderation">
            <AdminModerationPanel
              submissionId={details.submission.id}
              status={status.data}
              locale={locale}
            />
          </div>
        ) : null}
        <div id="access">
          {status.success && status.data === "needs_changes" ? (
            <AdminEditLinkPanel
              submissionId={details.submission.id}
              tokenStatus={editTokenStatus}
              locale={locale}
            />
          ) : null}
          <AdminWorkspaceLinkPanel
            submissionId={details.submission.id}
            tokenStatus={workspaceTokenStatus}
            canManage={canManageOperationalData}
            locale={locale}
          />
        </div>
        <div id="overview">
          <AdminSubmissionDetails
            details={details}
            locale={locale}
            hideHistory
          />
        </div>
        {canManageOperationalData ? (
          <div id="tournament-data">
            <StagesTeamsWorkspace
              stages={stages}
              teams={teams}
              actions={operationalActions}
              locale={locale}
            />
            <StageStructureLinks
              stages={stages}
              basePath={`/admin/submissions/${details.submission.id}`}
              locale={locale}
            />
            <RosterWorkspace
              teams={teams}
              members={rosterMembers}
              actions={rosterActions}
              locale={locale}
            />
            <section className="adminPanel matchManagementPanel">
              <MatchCreateForm
                stages={stages}
                teams={teams}
                locale={locale}
                defaultTimezone={details.submission.timezone}
                action={matchActions.create}
              />
              <MatchList
                matches={matches}
                locale={locale}
                detailBasePath={`/admin/submissions/${details.submission.id}/matches`}
                view="list"
              />
            </section>
          </div>
        ) : null}
        <div id="history">
          <AdminSubmissionDetails
            details={details}
            locale={locale}
            historyOnly
          />
        </div>
        <AdminTournamentData
          stages={stages}
          teams={teams}
          rosters={[]}
          matches={matches}
          summary={operationalSummary}
          showStagesAndTeams={!canManageOperationalData}
          showRosters={!canManageOperationalData}
          showMatches={!canManageOperationalData}
          locale={locale}
        />
      </div>
    </main>
  );
}
