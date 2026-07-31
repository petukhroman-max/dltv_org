import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";

import { AdminSubmissionDetails } from "@/components/admin/admin-submission-details";
import { adminCopy } from "@/lib/admin/copy";
import { loadAdminSubmissionDetails } from "@/lib/admin/details";
import { getTournamentSubmissionDetails } from "@/lib/repositories/submission-details";

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
      <AdminSubmissionDetails details={details} />
    </main>
  );
}
