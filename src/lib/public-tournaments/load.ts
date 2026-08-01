import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getPublishedTournamentBySlug } from "@/lib/public-tournaments/public-tournaments.repository";
import { getPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.service";
import { publicTournamentProjectionTag } from "@/lib/public-tournaments/public-operational.revalidation";

export const loadPublishedTournament = cache(getPublishedTournamentBySlug);

export async function loadPublicTournamentProjection(
  slug: string,
  locale: Parameters<typeof getPublicTournamentProjection>[1],
) {
  return unstable_cache(
    () => getPublicTournamentProjection(slug, locale),
    ["public-tournament-operational-projection-v2", slug, locale],
    { revalidate: 60, tags: [publicTournamentProjectionTag(slug)] },
  )();
}
