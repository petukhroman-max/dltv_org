import "server-only";

import { cache } from "react";

import { getPublishedTournamentBySlug } from "@/lib/public-tournaments/public-tournaments.repository";

export const loadPublishedTournament = cache(getPublishedTournamentBySlug);
