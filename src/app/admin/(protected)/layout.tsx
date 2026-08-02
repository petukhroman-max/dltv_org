import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import type { ReactNode } from "react";

import { logoutAdminAction } from "@/app/admin/actions";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getAdminCopy } from "@/lib/admin/copy";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getApiAdminCopy } from "@/lib/public-api/admin-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  noStore();
  const locale = await getRequestLocale();
  const adminCopy = getAdminCopy(locale);
  const apiCopy = getApiAdminCopy(locale);
  const admin = await requireAdmin();

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <Link
            className="adminBrand"
            href={localizePath(locale, "/admin/submissions")}
          >
            {adminCopy.brand}
          </Link>
          <Link
            className="adminNavLink"
            href={localizePath(locale, "/admin/api-access")}
          >
            {apiCopy.requests}
          </Link>
          <Link
            className="adminNavLink"
            href={localizePath(locale, "/admin/api-clients")}
          >
            {apiCopy.clients}
          </Link>
          <span className="adminSectionLabel">{adminCopy.nav.section}</span>
        </div>
        <nav className="adminNav" aria-label="Admin navigation">
          <Link
            href={localizePath(locale, "/admin/submissions")}
            aria-current="page"
            className="adminNavLink"
          >
            {adminCopy.nav.submissions}
          </Link>
          <span className="adminEmail">{admin.email}</span>
          <LocaleSwitcher locale={locale} label={adminCopy.nav.section} />
          <form action={logoutAdminAction.bind(null, locale)}>
            <button className="secondaryButton" type="submit">
              {adminCopy.nav.logout}
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
