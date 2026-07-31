import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { adminCopy } from "@/lib/admin/copy";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/presentation";
import type { TableRow } from "@/lib/supabase/database.types";

export type AdminSubmissionListRow = TableRow<"tournament_submissions"> & {
  organizer: { organization_name: string } | null;
};

export function AdminSubmissionsTable({
  submissions,
}: {
  submissions: AdminSubmissionListRow[];
}) {
  if (submissions.length === 0) {
    return <p className="adminEmpty">{adminCopy.list.empty}</p>;
  }

  return (
    <div className="adminTableScroll">
      <table className="adminTable">
        <thead>
          <tr>
            <th scope="col">{adminCopy.list.columns.tournament}</th>
            <th scope="col">{adminCopy.list.columns.organizer}</th>
            <th scope="col">{adminCopy.list.columns.region}</th>
            <th scope="col">{adminCopy.list.columns.startDate}</th>
            <th scope="col">{adminCopy.list.columns.status}</th>
            <th scope="col">{adminCopy.list.columns.submittedAt}</th>
            <th scope="col">{adminCopy.list.columns.updatedAt}</th>
            <th scope="col">
              <span className="visuallyHidden">
                {adminCopy.list.columns.view}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((submission) => (
            <tr key={submission.id}>
              <th scope="row">{submission.tournament_name}</th>
              <td>
                {submission.organizer?.organization_name ??
                  adminCopy.details.notAvailable}
              </td>
              <td>{submission.region}</td>
              <td>{formatAdminDate(submission.start_date)}</td>
              <td>
                <StatusBadge status={submission.status} />
              </td>
              <td>{formatAdminDateTime(submission.submitted_at)}</td>
              <td>{formatAdminDateTime(submission.updated_at)}</td>
              <td>
                <Link
                  className="adminRowLink"
                  href={`/admin/submissions/${submission.id}`}
                  aria-label={`${adminCopy.list.columns.view} ${submission.tournament_name}`}
                >
                  {adminCopy.list.columns.view}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
