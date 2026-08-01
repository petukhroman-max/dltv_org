import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import {
  cancelWorkspaceMatchAction,
  completeWorkspaceMatchAction,
  createWorkspaceMatchAction,
  deleteWorkspaceMatchAction,
  postponeWorkspaceMatchAction,
  reopenWorkspaceMatchAction,
  scheduleWorkspaceMatchAction,
  startWorkspaceMatchAction,
  updateWorkspaceMatchAction,
  walkoverWorkspaceMatchAction,
} from "@/app/workspace/[token]/actions";
import { getMatchCopy } from "@/components/operational/match-i18n";
import {
  MatchDetailPanel,
  type MatchActions,
} from "@/components/operational/match-workspace";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { OrganizerShell } from "@/components/ui/organizer-shell";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { getTournamentMatch } from "@/lib/operational-workspace/match.service";
import {
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceMatchPage({
  params,
}: {
  params: Promise<{ token: string; matchId: string }>;
}) {
  noStore();
  const [{ token, matchId }, locale, dictionary] = await Promise.all([
    params,
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const copy = getMatchCopy(locale);
  const access = await validateWorkspaceAccess(token);
  if (!access)
    return (
      <main className="adminMain workspaceInvalid">
        <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
        <section className="adminPanel">
          <h1>{dictionary.workspace.invalidTitle}</h1>
          <p>{dictionary.workspace.invalidDescription}</p>
        </section>
      </main>
    );
  const context = {
    kind: "organizer_workspace" as const,
    submissionId: access.submission.id,
    tokenId: access.tokenId,
  };
  const [stages, teams, match] = await Promise.all([
    listTournamentStages(access.submission.id),
    listTournamentTeams(access.submission.id),
    getTournamentMatch(access.submission.id, matchId, context),
  ]);
  if (!match) notFound();
  const actions: MatchActions = {
    create: createWorkspaceMatchAction.bind(null, token),
    update: updateWorkspaceMatchAction.bind(null, token),
    schedule: scheduleWorkspaceMatchAction.bind(null, token),
    start: startWorkspaceMatchAction.bind(null, token),
    postpone: postponeWorkspaceMatchAction.bind(null, token),
    complete: completeWorkspaceMatchAction.bind(null, token),
    walkover: walkoverWorkspaceMatchAction.bind(null, token),
    cancel: cancelWorkspaceMatchAction.bind(null, token),
    reopen: reopenWorkspaceMatchAction.bind(null, token),
    remove: deleteWorkspaceMatchAction.bind(null, token),
  };
  const listPath = localizePath(locale, `/workspace/${token}/matches`);
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
          items={[
            {
              label: access.submission.tournament_name,
              href: localizePath(locale, `/workspace/${token}`),
            },
            { label: copy.title, href: listPath },
            {
              label: match.match_number ? `#${match.match_number}` : copy.edit,
            },
          ]}
        />
        <header className="workspacePageHeader">
          <div>
            <p className="eyebrow">{match.stage?.name ?? copy.noStage}</p>
            <h1>
              {copy.edit}
              {match.match_number ? ` #${match.match_number}` : ""}
            </h1>
          </div>
          <Link className="secondaryButton" href={listPath}>
            {copy.back}
          </Link>
        </header>
        <MatchDetailPanel
          match={match}
          stages={stages}
          teams={teams}
          locale={locale}
          defaultTimezone={access.submission.timezone}
          actions={actions}
        />
      </main>
    </OrganizerShell>
  );
}
