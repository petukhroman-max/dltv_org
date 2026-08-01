"use client";

import Link from "next/link";
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
  const [activeSection, setActiveSection] = useState("overview");
  const sections = [
    ["overview", dictionary.nav.overview],
    ["workspace-stages", dictionary.nav.stages],
    ["workspace-teams", dictionary.nav.teams],
    ["workspace-rosters", dictionary.nav.rosters],
  ] as const;
  return (
    <div className="workspaceShell">
      <aside className="workspaceSidebar">
        <Link className="workspaceBrand" href={localizePath(locale, "/")}>
          {dictionary.common.brand}
        </Link>
        <p className="workspaceTournamentName">{tournamentName}</p>
        <nav aria-label={dictionary.a11y.sectionNavigation}>
          {sections.map(([anchor, label]) => (
            <a
              key={anchor}
              href={`#${anchor}`}
              aria-current={activeSection === anchor ? "page" : undefined}
              onClick={() => setActiveSection(anchor)}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <div className="workspaceFrame">
        <header className="workspaceTopbar">
          <details className="mobileSectionMenu">
            <summary>{dictionary.nav.menu}</summary>
            <nav aria-label={dictionary.a11y.sectionNavigation}>
              {sections.map(([anchor, label]) => (
                <a
                  key={anchor}
                  href={`#${anchor}`}
                  aria-current={activeSection === anchor ? "page" : undefined}
                  onClick={() => setActiveSection(anchor)}
                >
                  {label}
                </a>
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
