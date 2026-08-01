import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TournamentDetails } from "@/components/public/tournament-details";
import { PublicHeader } from "@/components/public/public-header";
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
  try {
    const tournament = await loadPublishedTournament(slug);
    return tournament
      ? tournamentMetadata(tournament)
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
  let tournament;
  try {
    tournament = await loadPublishedTournament(slug);
  } catch {
    return (
      <>
        <PublicHeader active="tournaments" />
        <main className="catalogShell">
          <p className="formError" role="alert">
            Tournament information is temporarily unavailable.
          </p>
        </main>
      </>
    );
  }
  if (!tournament) notFound();
  const jsonLd = sportsEventJsonLd(tournament);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PublicHeader active="tournaments" />
      <main className="catalogShell">
        <nav className="contextualNavigation" aria-label="Tournament actions">
          <Link className="textLink" href="/tournaments">
            ← All tournaments
          </Link>
          <Link className="secondaryButton" href="/submit-tournament">
            Submit a tournament
          </Link>
        </nav>
        <TournamentDetails tournament={tournament} today={today} />
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
