import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import {
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
import { getMatchCopy } from "@/components/operational/match-i18n";
import {
  MatchDetailPanel,
  type MatchActions,
} from "@/components/operational/match-workspace";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTournamentMatch } from "@/lib/operational-workspace/match.service";
import { getTournamentSubmissionDetails } from "@/lib/repositories/submission-details";
import {
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMatchDetailsPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  noStore();
  const [{ id, matchId }, locale, dictionary, identity] = await Promise.all([
    params,
    getRequestLocale(),
    getRequestDictionary(),
    requireAdmin(),
  ]);
  const details = await loadAdminSubmissionDetails(
    id,
    getTournamentSubmissionDetails,
    notFound,
  );
  const context = { kind: "admin" as const, identity };
  const [stages, teams, match] = await Promise.all([
    listTournamentStages(id),
    listTournamentTeams(id),
    getTournamentMatch(id, matchId, context),
  ]);
  if (!match) notFound();

  const actions: MatchActions = {
    create: createAdminMatchAction.bind(null, id),
    update: updateAdminMatchAction.bind(null, id),
    schedule: scheduleAdminMatchAction.bind(null, id),
    start: startAdminMatchAction.bind(null, id),
    postpone: postponeAdminMatchAction.bind(null, id),
    complete: completeAdminMatchAction.bind(null, id),
    walkover: walkoverAdminMatchAction.bind(null, id),
    cancel: cancelAdminMatchAction.bind(null, id),
    reopen: reopenAdminMatchAction.bind(null, id),
    remove: deleteAdminMatchAction.bind(null, id),
  };
  const copy = getMatchCopy(locale);
  const submissionPath = `/admin/submissions/${id}`;

  return (
    <main className="adminMain">
      <Breadcrumbs
        locale={locale}
        label={dictionary.a11y.breadcrumbs}
        items={[
          { label: dictionary.nav.submissions, href: "/admin/submissions" },
          { label: details.submission.tournament_name, href: submissionPath },
          { label: copy.title, href: `${submissionPath}#tournament-data` },
          { label: match.match_number ? `#${match.match_number}` : copy.edit },
        ]}
      />
      <header className="adminPageHeader adminDetailsHeader">
        <div>
          <p className="eyebrow">{match.stage?.name ?? copy.noStage}</p>
          <h1>
            {copy.edit}
            {match.match_number ? ` #${match.match_number}` : ""}
          </h1>
        </div>
        <Link
          className="secondaryButton"
          href={`${submissionPath}#tournament-data`}
        >
          {copy.back}
        </Link>
      </header>
      <MatchDetailPanel
        match={match}
        stages={stages}
        teams={teams}
        locale={locale}
        defaultTimezone={details.submission.timezone}
        actions={actions}
      />
    </main>
  );
}
