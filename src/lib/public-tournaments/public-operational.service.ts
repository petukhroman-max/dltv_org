import "server-only";

import type { Locale } from "@/i18n/config";
import { toPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.mapper";
import {
  listPublicTournamentMatches,
  listPublicTournamentRosters,
  listPublicTournamentStages,
  listPublicTournamentTeams,
  listPublicTournamentStructures,
} from "@/lib/public-tournaments/public-operational.repository";
import type { PublicTournamentProjection } from "@/lib/public-tournaments/public-operational.types";
import { getPublishedTournamentBySlug } from "@/lib/public-tournaments/public-tournaments.repository";

type ProjectionDependencies = {
  resolve: typeof getPublishedTournamentBySlug;
  stages: typeof listPublicTournamentStages;
  teams: typeof listPublicTournamentTeams;
  rosters: typeof listPublicTournamentRosters;
  matches: typeof listPublicTournamentMatches;
  structures?: typeof listPublicTournamentStructures;
};

const defaults: ProjectionDependencies = {
  resolve: getPublishedTournamentBySlug,
  stages: listPublicTournamentStages,
  teams: listPublicTournamentTeams,
  rosters: listPublicTournamentRosters,
  matches: listPublicTournamentMatches,
  structures: listPublicTournamentStructures,
};

export async function getPublicTournamentProjection(
  slug: string,
  locale: Locale,
  dependencies: ProjectionDependencies = defaults,
): Promise<PublicTournamentProjection | null> {
  const tournament = await dependencies.resolve(slug);
  if (!tournament) return null;
  const [stageRows, teamRows, rosterRows, matchRows] = await Promise.all([
    dependencies.stages(tournament.submission_id),
    dependencies.teams(tournament.submission_id),
    dependencies.rosters(tournament.submission_id),
    dependencies.matches(tournament.submission_id),
  ]);
  const structureRows = dependencies.structures
    ? await dependencies.structures(
        tournament.submission_id,
        stageRows.filter((stage) => stage.is_public).map((stage) => stage.id),
      )
    : { bracketLinks: [], standingsByStage: {} };
  return toPublicTournamentProjection({
    locale,
    tournament,
    stageRows,
    teamRows,
    rosterRows,
    matchRows,
    structureRows,
    onWarning: (code) => console.warn(`[public-tournament-projection] ${code}`),
  });
}

export const getPublicTournamentPage = getPublicTournamentProjection;

export async function getPublicStageBracket(
  slug: string,
  locale: Locale,
  stageSlug: string,
) {
  const projection = await getPublicTournamentProjection(slug, locale);
  return (
    projection?.brackets?.find((bracket) => bracket.stage.slug === stageSlug) ??
    null
  );
}

export async function getPublicStageStandings(
  slug: string,
  locale: Locale,
  stageSlug: string,
) {
  const projection = await getPublicTournamentProjection(slug, locale);
  return (
    projection?.standings?.find(
      (standings) => standings.stage.slug === stageSlug,
    ) ?? null
  );
}
