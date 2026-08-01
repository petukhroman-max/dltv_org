import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { mutateWorkspaceTournamentStructureAction } from "@/app/workspace/[token]/actions";
import { BracketWorkspace } from "@/components/operational/bracket-standings-workspace";
import { OrganizerShell } from "@/components/ui/organizer-shell";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { validateWorkspaceAccess } from "@/lib/organizer-workspace/workspace-token.service";
import { getBracket } from "@/lib/operational-workspace/bracket-standings.service";
import { listTournamentTeams } from "@/lib/repositories/tournament-operational-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WorkspaceBracketPage({
  params,
}: {
  params: Promise<{ token: string; stageId: string }>;
}) {
  noStore();
  const [{ token, stageId }, locale, dictionary] = await Promise.all([
    params,
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const access = await validateWorkspaceAccess(token);
  if (!access) notFound();
  const context = {
    kind: "organizer_workspace" as const,
    submissionId: access.submission.id,
    tokenId: access.tokenId,
  };
  const [data, teams] = await Promise.all([
    getBracket(access.submission.id, stageId, context),
    listTournamentTeams(access.submission.id),
  ]);
  if (!data.stage) notFound();
  const action = (operation: "position" | "link" | "unlink") =>
    mutateWorkspaceTournamentStructureAction.bind(null, operation, token);
  return (
    <OrganizerShell
      locale={locale}
      dictionary={dictionary}
      tournamentName={access.submission.tournament_name}
    >
      <main className="workspaceMain">
        <BracketWorkspace
          stage={data.stage}
          matches={data.matches}
          links={data.links}
          teams={teams}
          positionAction={action("position")}
          linkAction={action("link")}
          unlinkAction={action("unlink")}
          locale={locale}
        />
      </main>
    </OrganizerShell>
  );
}
