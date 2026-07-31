import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import type { ReactNode } from "react";

import { logoutAdminAction } from "@/app/admin/actions";
import { adminCopy } from "@/lib/admin/copy";
import { requireAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  noStore();
  const admin = await requireAdmin();

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <Link className="adminBrand" href="/admin/submissions">
            {adminCopy.brand}
          </Link>
          <span className="adminSectionLabel">{adminCopy.nav.section}</span>
        </div>
        <nav className="adminNav" aria-label="Admin navigation">
          <Link
            href="/admin/submissions"
            aria-current="page"
            className="adminNavLink"
          >
            {adminCopy.nav.submissions}
          </Link>
          <span className="adminEmail">{admin.email}</span>
          <form action={logoutAdminAction}>
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
