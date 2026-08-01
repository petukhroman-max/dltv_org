import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TournamentDetails } from "@/components/public/tournament-details";
import { PublicHeader } from "@/components/public/public-header";
import { localizePath } from "@/i18n/config";
import { getRequestDictionary, getRequestLocale } from "@/i18n/get-dictionary";
import { loadPublishedTournament } from "@/lib/public-tournaments/load";
import {
  sportsEventJsonLd,
  tournamentMetadata,
} from "@/lib/public-tournaments/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  try {
    const tournament = await loadPublishedTournament(slug);
    return tournament
      ? tournamentMetadata(tournament, locale)
      : { title: "Tournament not found" };
  } catch {
    return { title: "Tournament unavailable" };
  }
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [locale, dictionary] = await Promise.all([
    getRequestLocale(),
    getRequestDictionary(),
  ]);
  let tournament;
  try {
    tournament = await loadPublishedTournament(slug);
  } catch {
    return (
      <>
        <PublicHeader active="tournaments" locale={locale} />
        <main className="catalogShell">
          <p className="formError" role="alert">
            {dictionary.catalog.unavailableOne}
          </p>
        </main>
      </>
    );
  }
  if (!tournament) notFound();
  const jsonLd = sportsEventJsonLd(tournament, locale);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PublicHeader active="tournaments" locale={locale} />
      <main className="catalogShell">
        <nav className="contextualNavigation" aria-label="Tournament actions">
          <Link
            className="textLink"
            href={localizePath(locale, "/tournaments")}
          >
            ← {dictionary.catalog.allTournaments}
          </Link>
          <Link
            className="secondaryButton"
            href={localizePath(locale, "/submit-tournament")}
          >
            {dictionary.nav.submit}
          </Link>
        </nav>
        <TournamentDetails
          tournament={tournament}
          today={today}
          locale={locale}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      </main>
    </>
  );
}
