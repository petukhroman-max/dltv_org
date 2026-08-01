import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { getPublishedTournamentBySlug } from "@/lib/public-tournaments/public-tournaments.repository";
import { getPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.service";
import { publicTournamentProjectionTag } from "@/lib/public-tournaments/public-operational.revalidation";

export const loadPublishedTournament = cache(getPublishedTournamentBySlug);

export const loadPublicTournamentProjection = unstable_cache(
  getPublicTournamentProjection,
  ["public-tournament-operational-projection-v1"],
  { revalidate: 60, tags: [publicTournamentProjectionTag] },
);
