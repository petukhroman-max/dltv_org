import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  applyAdminImportAction,
  cancelAdminImportAction,
  confirmAdminImportTimezoneAction,
  mapAdminImportAction,
  resolveAdminImportAction,
  uploadAdminImportAction,
} from "./actions";
import { TournamentImportWorkspace } from "@/components/operational/tournament-import-workspace";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTournamentSubmissionById } from "@/lib/repositories/tournament-submissions";
import { loadTournamentImportSession } from "@/lib/tournament-import/import.service";
import {
  getImportCopy,
  getImportIssueMessage,
} from "@/lib/tournament-import/import-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    session?: string;
    filter?: string;
    error?: string;
    resolved?: string;
  }>;
}) {
  noStore();
  const [{ id }, query, locale, identity] = await Promise.all([
    params,
    searchParams,
    getRequestLocale(),
    requireAdmin(),
  ]);
  const submission = await getTournamentSubmissionById(id);
  if (!submission) notFound();
  const context = { kind: "admin" as const, identity };
  const session = query.session
    ? await loadTournamentImportSession(query.session, id, context)
    : null;
  const importCopy = getImportCopy(locale);
  return (
    <main className="adminMain">
      <p>
        <Link href={`/admin/submissions/${id}`}>
          ← {submission.tournament_name}
        </Link>
      </p>
      {query.error ? (
        <p className="fieldError importTopError" role="alert">
          {importCopy.errorPrefix}: {getImportIssueMessage(locale, query.error)}
        </p>
      ) : null}
      {query.resolved === "1" ? (
        <p className="successMessage" role="status">
          {importCopy.resolvedSuccess}
        </p>
      ) : null}
      <TournamentImportWorkspace
        locale={locale}
        session={session}
        filter={query.filter ?? "all"}
        uploadAction={uploadAdminImportAction.bind(null, id)}
        mappingAction={mapAdminImportAction.bind(null, id)}
        resolveAction={resolveAdminImportAction.bind(null, id)}
        confirmTimezoneAction={confirmAdminImportTimezoneAction.bind(null, id)}
        applyAction={applyAdminImportAction.bind(null, id)}
        cancelAction={cancelAdminImportAction.bind(null, id)}
      />
    </main>
  );
}
