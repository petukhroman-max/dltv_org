import type { Metadata } from "next";

import { localizePath, type Locale } from "@/i18n/config";
import { env } from "@/lib/env";
import { publicDescription } from "@/lib/public-tournaments/presentation";
import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";

export function absolutePublicUrl(path: string): string {
  return new URL(
    path,
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();
}

export function tournamentMetadata(
  tournament: PublishedTournament,
  locale: Locale = "en",
): Metadata {
  const title = `${tournament.tournament_name} | Deadlock tournaments`;
  const description = publicDescription(tournament);
  const path = `/tournaments/${tournament.slug}`;
  const url = absolutePublicUrl(localizePath(locale, path));
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: absolutePublicUrl(localizePath("en", path)),
        ru: absolutePublicUrl(localizePath("ru", path)),
      },
    },
    openGraph: { type: "website", title, description, url },
  };
}

export function sportsEventJsonLd(
  tournament: PublishedTournament,
  locale: Locale = "en",
) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: tournament.tournament_name,
    description: tournament.description ?? undefined,
    startDate: tournament.start_date,
    endDate: tournament.end_date,
    eventAttendanceMode: tournament.is_online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : undefined,
    organizer: {
      "@type": "Organization",
      name: tournament.organizer_name,
    },
    url: absolutePublicUrl(
      localizePath(locale, `/tournaments/${tournament.slug}`),
    ),
  };
}
