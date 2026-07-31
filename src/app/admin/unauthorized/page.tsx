import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { logoutAdminAction } from "@/app/admin/actions";
import { adminCopy } from "@/lib/admin/copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminUnauthorizedPage() {
  noStore();
  return (
    <main className="shell">
      <section className="adminLoginCard" aria-labelledby="denied-title">
        <p className="eyebrow">{adminCopy.brand}</p>
        <h1 id="denied-title">{adminCopy.unauthorized.title}</h1>
        <p className="description">{adminCopy.unauthorized.description}</p>
        <div className="formActions">
          <form action={logoutAdminAction}>
            <button className="primaryButton" type="submit">
              {adminCopy.nav.logout}
            </button>
          </form>
          <Link className="textLink" href="/admin/login">
            {adminCopy.unauthorized.back}
          </Link>
        </div>
      </section>
    </main>
  );
}
