"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [hash, setHash] = useState("");
  useEffect(() => setHash(window.location.hash), [pathname]);

  return (
    <nav className="localeSwitcher" aria-label={label}>
      {locales.map((value) => (
        <Link
          key={value}
          href={`${localizePath(value, pathname)}${query ? `?${query}` : ""}${hash}`}
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
