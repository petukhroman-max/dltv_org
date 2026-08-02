"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/en";

export function OrganizerShell({
  locale,
  dictionary,
  tournamentName,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  tournamentName: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const workspaceRoot =
    pathname.match(/^\/(?:en|ru)\/workspace\/[^/]+/)?.[0] ?? pathname;
  const isMatchesRoute = pathname.startsWith(`${workspaceRoot}/matches`);
  const isImportRoute = pathname.startsWith(`${workspaceRoot}/import`);
  const [activeSection, setActiveSection] = useState(
    isImportRoute ? "import" : isMatchesRoute ? "matches" : "overview",
  );
  const sections = [
    ["overview", dictionary.nav.overview, `${workspaceRoot}#overview`],
    [
      "workspace-stages",
      dictionary.nav.stages,
      `${workspaceRoot}#workspace-stages`,
    ],
    [
      "workspace-teams",
      dictionary.nav.teams,
      `${workspaceRoot}#workspace-teams`,
    ],
    ["matches", dictionary.nav.matches, `${workspaceRoot}/matches`],
    ["import", dictionary.nav.importData, `${workspaceRoot}/import`],
  ] as const;
  return (
    <div className="workspaceShell">
      <aside className="workspaceSidebar">
        <Link className="workspaceBrand" href={localizePath(locale, "/")}>
          {dictionary.common.brand}
        </Link>
        <p className="workspaceTournamentName">{tournamentName}</p>
        <nav aria-label={dictionary.a11y.sectionNavigation}>
          {sections.map(([anchor, label, href]) => (
            <Link
              key={anchor}
              href={href}
              aria-current={activeSection === anchor ? "page" : undefined}
              onClick={() => setActiveSection(anchor)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspaceFrame">
        <header className="workspaceTopbar">
          <details className="mobileSectionMenu">
            <summary>{dictionary.nav.menu}</summary>
            <nav aria-label={dictionary.a11y.sectionNavigation}>
              {sections.map(([anchor, label, href]) => (
                <Link
                  key={anchor}
                  href={href}
                  aria-current={activeSection === anchor ? "page" : undefined}
                  onClick={() => setActiveSection(anchor)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </details>
          <LocaleSwitcher locale={locale} label={dictionary.a11y.language} />
        </header>
        {children}
      </div>
    </div>
  );
}
