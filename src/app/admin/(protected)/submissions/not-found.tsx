import Link from "next/link";

import { adminCopy } from "@/lib/admin/copy";

export default function AdminSubmissionNotFound() {
  return (
    <main className="adminMain">
      <section className="adminPanel">
        <h1>{adminCopy.notFound.title}</h1>
        <p className="description">{adminCopy.notFound.description}</p>
        <Link
          className="primaryButton adminStandaloneAction"
          href="/admin/submissions"
        >
          {adminCopy.notFound.back}
        </Link>
      </section>
    </main>
  );
}
