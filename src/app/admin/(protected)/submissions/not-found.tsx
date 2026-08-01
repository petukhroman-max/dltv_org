import Link from "next/link";

import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getAdminCopy } from "@/lib/admin/copy";

export default async function AdminSubmissionNotFound() {
  const locale = await getRequestLocale();
  const adminCopy = getAdminCopy(locale);
  return (
    <main className="adminMain">
      <section className="adminPanel">
        <h1>{adminCopy.notFound.title}</h1>
        <p className="description">{adminCopy.notFound.description}</p>
        <Link
          className="primaryButton adminStandaloneAction"
          href={localizePath(locale, "/admin/submissions")}
        >
          {adminCopy.notFound.back}
        </Link>
      </section>
    </main>
  );
}
