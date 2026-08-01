import Link from "next/link";
import type { Metadata } from "next";

import { PublicHeader } from "@/components/public/public-header";
import { TournamentCard } from "@/components/public/tournament-card";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { listPublishedTournaments } from "@/lib/public-tournaments/public-tournaments.repository";
import { absolutePublicUrl } from "@/lib/public-tournaments/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  return {
    title: dictionary.common.brand,
    description: dictionary.home.description,
    alternates: {
      canonical: absolutePublicUrl(`/${locale}`),
      languages: { en: absolutePublicUrl("/en"), ru: absolutePublicUrl("/ru") },
    },
  };
}

export default async function Home() {
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  let recentTournaments = null;
  try {
    recentTournaments = await listPublishedTournaments(
      { lifecycle: "all", page: 1, limit: 3 },
      undefined,
      today,
    );
  } catch {
    // The landing page remains useful when the public read model is unavailable.
  }

  return (
    <>
      <PublicHeader locale={locale} />
      <main className="publicMain landingPage">
        <section className="landingHero" aria-labelledby="page-title">
          <div className="landingHeroInner">
            <div className="landingHeroCopy">
              <p className="eyebrow">{dictionary.home.eyebrow}</p>
              <h1 id="page-title">{dictionary.home.title}</h1>
              <p className="description">{dictionary.home.description}</p>
              <div className="heroActions">
                <Link
                  className="primaryButton"
                  href={localizePath(locale, "/submit-tournament")}
                >
                  {dictionary.nav.submit}
                </Link>
                <Link
                  className="secondaryButton"
                  href={localizePath(locale, "/tournaments")}
                >
                  {dictionary.nav.tournaments}
                </Link>
              </div>
            </div>
            <div className="landingDataPreview" aria-hidden="true">
              <span>DLTV / OPERATIONS</span>
              <strong>STAGES · TEAMS · MATCHES</strong>
              <div className="landingDataLines">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </section>

        <section className="landingSection" aria-labelledby="workflow-title">
          <div className="landingSectionHeader">
            <p className="eyebrow">{dictionary.home.workflowEyebrow}</p>
            <h2 id="workflow-title">{dictionary.home.workflowTitle}</h2>
            <p>{dictionary.home.workflowDescription}</p>
          </div>
          <ol className="workflowGrid">
            {dictionary.home.workflow.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="landingSection capabilitySection"
          aria-labelledby="workspace-title"
        >
          <div className="landingSectionHeader">
            <p className="eyebrow">{dictionary.home.workspaceEyebrow}</p>
            <h2 id="workspace-title">{dictionary.home.workspaceTitle}</h2>
            <p>{dictionary.home.workspaceDescription}</p>
          </div>
          <ul className="capabilityList">
            {dictionary.home.capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </section>

        <section
          className="landingSection publicDataSection"
          aria-labelledby="public-data-title"
        >
          <div className="landingSectionHeader">
            <p className="eyebrow">{dictionary.home.publicEyebrow}</p>
            <h2 id="public-data-title">{dictionary.home.publicTitle}</h2>
            <p>{dictionary.home.publicDescription}</p>
          </div>
          <div className="dataSequence" aria-hidden="true">
            <span>01 / MATCHES</span>
            <span>02 / STAGES</span>
            <span>03 / TEAMS &amp; ROSTERS</span>
          </div>
        </section>

        <section className="landingSection" aria-labelledby="recent-title">
          <div className="landingSectionHeader landingSectionHeaderRow">
            <div>
              <p className="eyebrow">{dictionary.home.recentEyebrow}</p>
              <h2 id="recent-title">{dictionary.home.recentTitle}</h2>
              <p>{dictionary.home.recentDescription}</p>
            </div>
            <Link
              className="secondaryButton"
              href={localizePath(locale, "/tournaments")}
            >
              {dictionary.home.browseAll}
            </Link>
          </div>
          {recentTournaments ? (
            recentTournaments.tournaments.length ? (
              <div className="tournamentGrid landingTournamentGrid">
                {recentTournaments.tournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament.id}
                    tournament={tournament}
                    today={today}
                    locale={locale}
                  />
                ))}
              </div>
            ) : (
              <p className="publicEmptyState">
                {dictionary.catalog.emptyDescription}
              </p>
            )
          ) : (
            <p className="publicEmptyState">
              {dictionary.home.recentUnavailable}
            </p>
          )}
        </section>

        <section
          className="landingSection productStatus"
          aria-labelledby="status-title"
        >
          <div className="landingSectionHeader">
            <p className="eyebrow">{dictionary.home.statusEyebrow}</p>
            <h2 id="status-title">{dictionary.home.statusTitle}</h2>
            <p>{dictionary.home.statusDescription}</p>
          </div>
        </section>
      </main>
    </>
  );
}
