import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { mutateAdminTournamentStructureAction } from "@/app/admin/(protected)/submissions/[id]/operational-actions";
import { StandingsWorkspace } from "@/components/operational/bracket-standings-workspace";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getStandings } from "@/lib/operational-workspace/bracket-standings.service";
import { listTournamentTeams } from "@/lib/repositories/tournament-operational-data";
import { getRequestLocale } from "@/i18n/get-dictionary";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminStandingsPage({
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
    getStandings(id, stageId, { kind: "admin", identity }),
    listTournamentTeams(id),
  ]);
  if (!data.stage) notFound();
  const action = (
    operation:
      | "config"
      | "assign_group"
      | "remove_group"
      | "adjust"
      | "delete_adjustment",
  ) => mutateAdminTournamentStructureAction.bind(null, operation, id);
  return (
    <main className="adminMain">
      <StandingsWorkspace
        stage={data.stage}
        config={data.config}
        groups={data.groups}
        adjustments={data.adjustments}
        standings={data.standings as unknown as Array<Record<string, unknown>>}
        teams={teams}
        configAction={action("config")}
        groupAction={action("assign_group")}
        removeGroupAction={action("remove_group")}
        adjustmentAction={action("adjust")}
        deleteAdjustmentAction={action("delete_adjustment")}
        locale={locale}
      />
    </main>
  );
}
