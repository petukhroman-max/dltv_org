import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  AdminSubmissionsTable,
  type AdminSubmissionListRow,
} from "@/components/admin/admin-submissions-table";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import {
  buildAdminSubmissionsQuery,
  parseAdminSubmissionFilters,
} from "@/lib/admin/filters";
import { getAdminCopy } from "@/lib/admin/copy";
import { submissionStatuses } from "@/lib/domain/submission";
import { listTournamentSubmissions } from "@/lib/repositories/tournament-submissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const adminCopy = getAdminCopy(locale);
  const filters = parseAdminSubmissionFilters(await searchParams);
  let submissions: AdminSubmissionListRow[] = [];
  let loadFailed = false;

  try {
    submissions = (await listTournamentSubmissions(
      filters,
    )) as AdminSubmissionListRow[];
  } catch {
    loadFailed = true;
  }

  const hasNextPage = submissions.length > 25;
  const visibleSubmissions = submissions.slice(0, 25);

  return (
    <main className="adminMain">
      <header className="adminPageHeader">
        <p className="eyebrow">{adminCopy.list.eyebrow}</p>
        <h1>{adminCopy.list.title}</h1>
        <p className="description">{adminCopy.list.description}</p>
      </header>

      <form className="adminFilters" method="get">
        <h2>{adminCopy.list.filters}</h2>
        <div className="adminFilterGrid">
          <label>
            <span>{adminCopy.list.status}</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">{adminCopy.list.allStatuses}</option>
              {submissionStatuses.map((status) => (
                <option value={status} key={status}>
                  {dictionary.domain.status[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{adminCopy.list.region}</span>
            <input
              name="region"
              type="search"
              defaultValue={filters.region ?? ""}
              maxLength={100}
            />
          </label>
          <label>
            <span>{adminCopy.list.startFrom}</span>
            <input
              name="start_date_from"
              type="date"
              defaultValue={filters.start_date_from ?? ""}
            />
          </label>
          <label>
            <span>{adminCopy.list.startTo}</span>
            <input
              name="start_date_to"
              type="date"
              defaultValue={filters.start_date_to ?? ""}
            />
          </label>
        </div>
        <div className="adminFilterActions">
          <button className="primaryButton" type="submit">
            {adminCopy.list.apply}
          </button>
          <Link
            className="textLink"
            href={localizePath(locale, "/admin/submissions")}
          >
            {adminCopy.list.clear}
          </Link>
        </div>
      </form>

      {loadFailed ? (
        <p className="formError" role="alert">
          {adminCopy.list.error}
        </p>
      ) : (
        <AdminSubmissionsTable
          submissions={visibleSubmissions}
          locale={locale}
        />
      )}

      {!loadFailed && (filters.page > 1 || hasNextPage) ? (
        <nav className="adminPagination" aria-label="Pagination">
          {filters.page > 1 ? (
            <Link
              className="secondaryButton"
              href={localizePath(
                locale,
                buildAdminSubmissionsQuery(filters, filters.page - 1),
              )}
            >
              {adminCopy.list.previous}
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link
              className="secondaryButton"
              href={localizePath(
                locale,
                buildAdminSubmissionsQuery(filters, filters.page + 1),
              )}
            >
              {adminCopy.list.next}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
