import { unstable_noStore as noStore } from "next/cache";

import {
  applyWorkspaceImportAction,
  cancelWorkspaceImportAction,
  confirmWorkspaceImportTimezoneAction,
  resolveWorkspaceImportAction,
  mapWorkspaceImportAction,
  uploadWorkspaceImportAction,
} from "./actions";
import { TournamentImportWorkspace } from "@/components/operational/tournament-import-workspace";
import { OrganizerShell } from "@/components/ui/organizer-shell";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { loadTournamentImportSession } from "@/lib/tournament-import/import.service";
import {
  getImportCopy,
  getImportIssueMessage,
} from "@/lib/tournament-import/import-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session?: string; filter?: string; error?: string }>;
}) {
  noStore();
  const [{ token }, query, locale, dictionary] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const access = await validateWorkspaceAccess(token);
  if (!access)
    return (
      <main className="adminMain">
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
  const session = query.session
    ? await loadTournamentImportSession(
        query.session,
        access.submission.id,
        context,
      )
    : null;
  const importCopy = getImportCopy(locale);
  return (
    <OrganizerShell
      locale={locale}
      dictionary={dictionary}
      tournamentName={access.submission.tournament_name}
    >
      <main className="workspaceMain">
        {query.error ? (
          <p className="fieldError importTopError" role="alert">
            {importCopy.errorPrefix}:{" "}
            {getImportIssueMessage(locale, query.error)}
          </p>
        ) : null}
        <TournamentImportWorkspace
          locale={locale}
          session={session}
          filter={query.filter ?? "all"}
          uploadAction={uploadWorkspaceImportAction.bind(null, token)}
          resolveAction={resolveWorkspaceImportAction.bind(null, token)}
          confirmTimezoneAction={confirmWorkspaceImportTimezoneAction.bind(
            null,
            token,
          )}
          mappingAction={mapWorkspaceImportAction.bind(null, token)}
          applyAction={applyWorkspaceImportAction.bind(null, token)}
          cancelAction={cancelWorkspaceImportAction.bind(null, token)}
        />
      </main>
    </OrganizerShell>
  );
}
