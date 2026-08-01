import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { logoutAdminAction } from "@/app/admin/actions";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getAdminCopy } from "@/lib/admin/copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminUnauthorizedPage() {
  noStore();
  const locale = await getRequestLocale();
  const adminCopy = getAdminCopy(locale);
  return (
    <main className="shell">
      <section className="adminLoginCard" aria-labelledby="denied-title">
        <p className="eyebrow">{adminCopy.brand}</p>
        <h1 id="denied-title">{adminCopy.unauthorized.title}</h1>
        <p className="description">{adminCopy.unauthorized.description}</p>
        <div className="formActions">
          <form action={logoutAdminAction.bind(null, locale)}>
            <button className="primaryButton" type="submit">
              {adminCopy.nav.logout}
            </button>
          </form>
          <Link
            className="textLink"
            href={localizePath(locale, "/admin/login")}
          >
            {adminCopy.unauthorized.back}
          </Link>
        </div>
      </section>
    </main>
  );
}
