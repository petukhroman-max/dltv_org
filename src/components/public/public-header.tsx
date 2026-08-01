import Link from "next/link";
import { Suspense } from "react";

import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { defaultLocale, localizePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type PublicSection = "tournaments" | "submit";

export function PublicHeader({
  active,
  locale = defaultLocale,
}: {
  active?: PublicSection;
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);
  return (
    <header className="publicHeader">
      <div className="publicHeaderInner">
        <Link className="publicBrand" href={localizePath(locale, "/")}>
          {dictionary.common.brand}
        </Link>
        <div className="publicHeaderActions">
          <nav className="publicNav" aria-label={dictionary.nav.publicLabel}>
            <Link
              className="publicNavLink"
              href={localizePath(locale, "/tournaments")}
              aria-current={active === "tournaments" ? "page" : undefined}
            >
              {dictionary.nav.tournaments}
            </Link>
            <Link
              className="publicNavLink"
              href={localizePath(locale, "/submit-tournament")}
              aria-current={active === "submit" ? "page" : undefined}
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
