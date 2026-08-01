import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminSubmissionDetails } from "@/components/admin/admin-submission-details";
import { AdminTournamentData } from "@/components/admin/admin-tournament-data";
import { AdminModerationPanel } from "@/components/admin/admin-moderation-panel";
import { AdminEditLinkPanel } from "@/components/admin/admin-edit-link-panel";
import { AdminWorkspaceLinkPanel } from "@/components/admin/admin-workspace-link-panel";
import { StagesTeamsWorkspace } from "@/components/operational/stages-teams-workspace";
import { RosterWorkspace } from "@/components/operational/roster-workspace";
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
} from "@/app/admin/(protected)/submissions/[id]/operational-actions";
import { adminCopy } from "@/lib/admin/copy";
import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTournamentSubmissionDetails } from "@/lib/repositories/submission-details";
import {
  getTournamentOperationalSummary,
  listTournamentMatches,
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";
import { submissionStatusSchema } from "@/lib/domain/submission";
import { getSubmissionEditTokenStatus } from "@/lib/organizer-edit/organizer-edit.service";
import { getWorkspaceTokenStatus } from "@/lib/organizer-workspace/workspace-token.service";
import { listTeamRoster } from "@/lib/operational-workspace/roster.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSubmissionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  noStore();
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
      listTournamentMatches(details.submission.id),
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

  return (
    <main className="adminMain">
      <Link className="textLink adminBackLink" href="/admin/submissions">
        ← {adminCopy.details.back}
      </Link>
      <header className="adminPageHeader adminDetailsHeader">
        <p className="eyebrow">{adminCopy.list.eyebrow}</p>
        <h1>{details.submission.tournament_name}</h1>
        <p className="description">
          Submission reference: <code>{details.submission.id}</code>
        </p>
      </header>
      <div className="adminDetails">
        {status.success ? (
          <AdminModerationPanel
            submissionId={details.submission.id}
            status={status.data}
          />
        ) : null}
        {status.success && status.data === "needs_changes" ? (
          <AdminEditLinkPanel
            submissionId={details.submission.id}
            tokenStatus={editTokenStatus}
          />
        ) : null}
        <AdminWorkspaceLinkPanel
          submissionId={details.submission.id}
          tokenStatus={workspaceTokenStatus}
          canManage={canManageOperationalData}
        />
        <AdminSubmissionDetails details={details} />
        {canManageOperationalData ? (
          <>
            <StagesTeamsWorkspace
              stages={stages}
              teams={teams}
              actions={operationalActions}
            />
            <RosterWorkspace
              teams={teams}
              members={rosterMembers}
              actions={rosterActions}
            />
          </>
        ) : null}
        <AdminTournamentData
          stages={stages}
          teams={teams}
          rosters={[]}
          matches={matches}
          summary={operationalSummary}
          showStagesAndTeams={!canManageOperationalData}
          showRosters={!canManageOperationalData}
        />
      </div>
    </main>
  );
}
