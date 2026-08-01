"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useState } from "react";

import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { defaultLocale, localizePath, type Locale } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { ru } from "@/i18n/dictionaries/ru";

type PublicSection = "tournaments" | "submit";

export function PublicHeader({
  active,
  locale = defaultLocale,
}: {
  active?: PublicSection;
  locale?: Locale;
}) {
  const dictionary = locale === "ru" ? ru : en;
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="publicHeader">
      <div className="publicHeaderInner">
        <Link className="publicBrand" href={localizePath(locale, "/")}>
          <span className="publicBrandMark" aria-hidden="true">
            D
          </span>
          <span>{dictionary.common.brand}</span>
        </Link>
        <div className="publicHeaderActions">
          <button
            className="publicMenuButton"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="public-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {dictionary.nav.menu}
          </button>
          <nav
            id="public-navigation"
            className="publicNav"
            data-open={menuOpen ? "true" : "false"}
            aria-label={dictionary.nav.publicLabel}
          >
            <Link
              className="publicNavLink"
              href={localizePath(locale, "/tournaments")}
              aria-current={active === "tournaments" ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {dictionary.nav.tournaments}
            </Link>
            <Link
              className="publicNavLink publicNavCta"
              href={localizePath(locale, "/submit-tournament")}
              aria-current={active === "submit" ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {dictionary.nav.submit}
            </Link>
          </nav>
          <Suspense fallback={null}>
            <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
