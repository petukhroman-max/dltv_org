import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { mutateAdminTournamentStructureAction } from "@/app/admin/(protected)/submissions/[id]/operational-actions";
import { BracketWorkspace } from "@/components/operational/bracket-standings-workspace";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getBracket } from "@/lib/operational-workspace/bracket-standings.service";
import { listTournamentTeams } from "@/lib/repositories/tournament-operational-data";
import { getRequestLocale } from "@/i18n/get-dictionary";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminBracketPage({
  params,
}: {
  params: Promise<{ id: string; stageId: string }>;
}) {
  noStore();
  const { id, stageId } = await params;
  const [identity, locale] = await Promise.all([
    requireAdmin(),
    getRequestLocale(),
  ]);
  const [data, teams] = await Promise.all([
    getBracket(id, stageId, { kind: "admin", identity }),
    listTournamentTeams(id),
  ]);
  if (!data.stage) notFound();
  const action = (operation: "position" | "link" | "unlink") =>
    mutateAdminTournamentStructureAction.bind(null, operation, id);
  return (
    <main className="adminMain">
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
  );
}
