import type { Metadata } from "next";

import { localizePath, type Locale } from "@/i18n/config";
import { env } from "@/lib/env";
import { publicDescription } from "@/lib/public-tournaments/presentation";
import type { PublicTournamentOverview } from "@/lib/public-tournaments/public-operational.types";

export function absolutePublicUrl(path: string): string {
  return new URL(
    path,
    env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ).toString();
}

export function tournamentMetadata(
  tournament: PublicTournamentOverview,
  locale: Locale = "en",
): Metadata {
  const title = `${tournament.tournament_name} | ${locale === "ru" ? "Турниры Deadlock" : "Deadlock tournaments"}`;
  const description = publicDescription(tournament, locale);
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
    openGraph: {
      type: "website",
      title,
      description,
      url,
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: locale === "ru" ? ["en_US"] : ["ru_RU"],
    },
  };
}

export function sportsEventJsonLd(
  tournament: PublicTournamentOverview,
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
    location: tournament.is_online
      ? {
          "@type": "VirtualLocation",
          url: absolutePublicUrl(
            localizePath(locale, `/tournaments/${tournament.slug}`),
          ),
        }
      : tournament.region
        ? { "@type": "Place", name: tournament.region }
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
