import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

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
  MatchCreateForm,
  MatchList,
  type MatchActions,
} from "@/components/operational/match-workspace";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { OrganizerShell } from "@/components/ui/organizer-shell";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { listTournamentMatches } from "@/lib/operational-workspace/match.service";
import {
  listTournamentStages,
  listTournamentTeams,
} from "@/lib/repositories/tournament-operational-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function WorkspaceMatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const [{ token }, query, locale, dictionary] = await Promise.all([
    params,
    searchParams,
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
  const filters = {
    stage_id: first(query.stage_id) || undefined,
    status: first(query.status) || undefined,
    team_id: first(query.team_id) || undefined,
    date: first(query.date) || undefined,
    view: first(query.view) === "schedule" ? "schedule" : "list",
  } as const;
  const [stages, teams, matches] = await Promise.all([
    listTournamentStages(access.submission.id),
    listTournamentTeams(access.submission.id),
    listTournamentMatches(access.submission.id, context, filters),
  ]);
  const actionSet: MatchActions = {
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
  const basePath = localizePath(locale, `/workspace/${token}/matches`);
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
            { label: copy.title },
          ]}
        />
        <header className="workspacePageHeader">
          <div>
            <p className="eyebrow">{dictionary.workspace.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p className="description">{copy.description}</p>
          </div>
        </header>
        <MatchCreateForm
          stages={stages}
          teams={teams}
          locale={locale}
          defaultTimezone={access.submission.timezone}
          action={actionSet.create}
        />
        <section
          className="adminPanel matchFiltersPanel"
          aria-labelledby="match-filters-heading"
        >
          <h2 id="match-filters-heading">{copy.filters}</h2>
          <div
            className="matchViewSwitch"
            role="navigation"
            aria-label={copy.filters}
          >
            <Link
              href={`${basePath}?view=list`}
              aria-current={filters.view === "list" ? "page" : undefined}
            >
              {copy.list}
            </Link>
            <Link
              href={`${basePath}?view=schedule`}
              aria-current={filters.view === "schedule" ? "page" : undefined}
            >
              {copy.schedule}
            </Link>
          </div>
          <form method="get" className="matchFilterForm">
            <input type="hidden" name="view" value={filters.view} />
            <label>
              {copy.stage}
              <select name="stage_id" defaultValue={filters.stage_id ?? ""}>
                <option value="">{copy.allStages}</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.status}
              <select name="status" defaultValue={filters.status ?? ""}>
                <option value="">{copy.allStatuses}</option>
                {Object.entries(copy.statuses).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.teamA}
              <select name="team_id" defaultValue={filters.team_id ?? ""}>
                <option value="">{copy.allTeams}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {copy.scheduledDate}
              <input
                type="date"
                name="date"
                defaultValue={filters.date ?? ""}
              />
            </label>
            <div className="formActions">
              <button className="primaryButton" type="submit">
                {copy.apply}
              </button>
              <Link
                className="textLink"
                href={`${basePath}?view=${filters.view}`}
              >
                {copy.clear}
              </Link>
            </div>
          </form>
        </section>
        <MatchList
          matches={matches}
          locale={locale}
          detailBasePath={basePath}
          view={filters.view}
        />
      </main>
    </OrganizerShell>
  );
}
