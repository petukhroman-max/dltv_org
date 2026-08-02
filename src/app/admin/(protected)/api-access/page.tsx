import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getApiAdminCopy } from "@/lib/public-api/admin-copy";
import { listApiAccessRequests } from "@/lib/public-api/admin.repository";
export default async function ApiAccessRequestsPage() {
  const locale = await getRequestLocale();
  const copy = getApiAdminCopy(locale);
  const requests = await listApiAccessRequests();
  return (
    <main className="adminMain">
      <h1>{copy.requests}</h1>
      <div className="apiTableScroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{copy.organization}</th>
              <th>{copy.contact}</th>
              <th>{copy.status}</th>
              <th>{copy.created}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.organization_name}</td>
                <td>{request.contact_email}</td>
                <td>{request.status}</td>
                <td>{new Date(request.created_at).toLocaleString()}</td>
                <td>
                  <Link
                    href={localizePath(
                      locale,
                      `/admin/api-access/${request.id}`,
                    )}
                  >
                    {copy.review}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
