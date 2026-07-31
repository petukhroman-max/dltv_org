"use client";

import { adminCopy } from "@/lib/admin/copy";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="adminMain">
      <section className="adminPanel">
        <h1>{adminCopy.error.title}</h1>
        <p className="description">{adminCopy.error.description}</p>
        <button
          className="primaryButton adminStandaloneAction"
          type="button"
          onClick={reset}
        >
          {adminCopy.error.retry}
        </button>
      </section>
    </main>
  );
}
