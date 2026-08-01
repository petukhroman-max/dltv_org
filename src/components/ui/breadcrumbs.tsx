import Link from "next/link";

import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/config";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({
  items,
  locale,
  label,
}: {
  items: BreadcrumbItem[];
  locale: Locale;
  label: string;
}) {
  return (
    <nav className="breadcrumbs" aria-label={label}>
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? (
              <Link href={localizePath(locale, item.href)}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
