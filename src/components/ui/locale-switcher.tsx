"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { locales, localizePath, type Locale } from "@/i18n/config";

export function LocaleSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname() ?? `/${locale}`;
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";

  return (
    <nav className="localeSwitcher" aria-label={label}>
      {locales.map((value) => (
        <Link
          key={value}
          href={`${localizePath(value, pathname)}${query ? `?${query}` : ""}`}
          hrefLang={value}
          lang={value}
          aria-current={locale === value ? "page" : undefined}
        >
          {value.toUpperCase()}
        </Link>
      ))}
    </nav>
  );
}
