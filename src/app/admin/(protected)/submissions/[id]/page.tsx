import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminSubmissionDetails } from "@/components/admin/admin-submission-details";
import { AdminModerationPanel } from "@/components/admin/admin-moderation-panel";
import { AdminEditLinkPanel } from "@/components/admin/admin-edit-link-panel";
import { adminCopy } from "@/lib/admin/copy";
import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { getTournamentSubmissionDetails } from "@/lib/repositories/submission-details";
import { submissionStatusSchema } from "@/lib/domain/submission";
import { getSubmissionEditTokenStatus } from "@/lib/organizer-edit/organizer-edit.service";

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
        <AdminSubmissionDetails details={details} />
      </div>
    </main>
  );
}
