import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getApiAdminCopy } from "@/lib/public-api/admin-copy";
import { listApiClients } from "@/lib/public-api/admin.repository";
export default async function ApiClientsPage() {
  const locale = await getRequestLocale();
  const copy = getApiAdminCopy(locale);
  const clients = await listApiClients();
  return (
    <main className="adminMain">
      <h1>{copy.clients}</h1>
      <div className="apiTableScroll" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>{copy.organization}</th>
              <th>{copy.status}</th>
              <th>{copy.attribution}</th>
              <th>{copy.limits}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  {client.organization_name}
                  <br />
                  <small>{client.client_slug}</small>
                </td>
                <td>{client.status}</td>
                <td>{client.attribution_status}</td>
                <td>
                  {client.default_rate_limit_per_minute}/min ·{" "}
                  {client.default_rate_limit_per_day}/day
                </td>
                <td>
                  <Link
                    href={localizePath(
                      locale,
                      `/admin/api-clients/${client.id}`,
                    )}
                  >
                    {copy.manage}
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
