"use client";

import { usePathname } from "next/navigation";
import { defaultLocale, localeFromPathname } from "@/i18n/config";
import { getAdminCopy } from "@/lib/admin/copy";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = localeFromPathname(usePathname()) ?? defaultLocale;
  const copy = getAdminCopy(locale);
  return (
    <main className="adminMain">
      <section className="adminPanel">
        <h1>{copy.error.title}</h1>
        <p className="description">{copy.error.description}</p>
        <button
          className="primaryButton adminStandaloneAction"
          type="button"
          onClick={reset}
        >
          {copy.error.retry}
        </button>
      </section>
    </main>
  );
}
