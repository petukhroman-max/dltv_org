import type { Locale } from "@/i18n/config";
import { safePublicUrl } from "@/lib/public-tournaments/presentation";
import type { PublishedTournament } from "@/lib/public-tournaments/public-tournaments.types";
import type {
  PublicMatch,
  PublicMatchGroups,
  PublicMatchRow,
  PublicOperationalSummary,
  PublicRosterMember,
  PublicRosterRow,
  PublicStage,
  PublicStageRow,
  PublicTeam,
  PublicTeamRow,
  PublicTeamSummary,
  PublicTournamentOverview,
  PublicTournamentProjection,
} from "@/lib/public-tournaments/public-operational.types";

export function toPublicStage(row: PublicStageRow): PublicStage {
  return {
    name: row.name,
    slug: row.slug,
    stage_type: row.stage_type,
    sequence_number: row.sequence_number,
    start_at: row.start_at,
    end_at: row.end_at,
    timezone: row.timezone,
    format_text: row.format_text,
    best_of_default: row.best_of_default,
    team_count: row.team_count,
    is_online: row.is_online,
    location_name: row.location_name,
    status: row.status,
  };
}

export function toPublicRosterMember(row: PublicRosterRow): PublicRosterMember {
  return {
    display_name: row.player.display_name,
    country_code: row.player.country_code,
    role: row.role,
    is_captain: row.is_captain,
  };
}

function toPublicTeamSummary(row: PublicTeamRow): PublicTeamSummary {
  return {
    name: row.name,
    short_name: row.short_name,
    slug: row.slug,
    logo_url: safePublicUrl(row.logo_url),
  };
}

export function toPublicTeam(
  row: PublicTeamRow,
  roster: PublicRosterRow[],
): PublicTeam {
  return {
    name: row.name,
    short_name: row.short_name,
    slug: row.slug,
    logo_url: safePublicUrl(row.logo_url),
    region: row.region,
    seed: row.seed,
    status: row.status,
    roster: roster
      .filter(
        (member) =>
          member.tournament_team_id === row.id &&
          member.is_active &&
          member.player.is_public,
      )
      .map(toPublicRosterMember)
      .sort(
        (a, b) =>
          Number(b.is_captain) - Number(a.is_captain) ||
          a.role.localeCompare(b.role) ||
          a.display_name.localeCompare(b.display_name),
      ),
  };
}

function matchPublicId(row: PublicMatchRow, ordinal: number) {
  const context = row.group_name ?? row.round_name;
  if (context && row.match_number)
    return `${context} Â· Match ${row.match_number}`;
  if (row.match_number) return `Match ${row.match_number}`;
  if (context) return context;
  return `Match ${ordinal + 1}`;
}

export function toPublicMatch(
  row: PublicMatchRow,
  stages: PublicStageRow[],
  teams: PublicTeamRow[],
  ordinal: number,
  tournamentTimezone: string,
): PublicMatch {
  const stage = stages.find((candidate) => candidate.id === row.stage_id);
  const teamA = teams.find((candidate) => candidate.id === row.team_a_id);
  const teamB = teams.find((candidate) => candidate.id === row.team_b_id);
  const winner = teams.find((candidate) => candidate.id === row.winner_team_id);
  const canExposeTechnicalReference = ["live", "completed"].includes(
    row.status,
  );
  return {
    public_id: matchPublicId(row, ordinal),
    stage: stage
      ? {
          name: stage.name,
          slug: stage.slug,
          sequence_number: stage.sequence_number,
        }
      : null,
    match_number: row.match_number,
    round_name: row.round_name,
    group_name: row.group_name,
    scheduled_at: row.scheduled_at,
    timezone: stage?.timezone ?? tournamentTimezone,
    best_of: row.best_of,
    team_a: teamA ? toPublicTeamSummary(teamA) : null,
    team_b: teamB ? toPublicTeamSummary(teamB) : null,
    score_a: row.score_a,
    score_b: row.score_b,
    status: row.status,
    winner: winner ? toPublicTeamSummary(winner) : null,
    stream_url: safePublicUrl(row.stream_url),
    vod_url: safePublicUrl(row.vod_url),
    duration_seconds: row.duration_seconds,
    deadlock_match_id: canExposeTechnicalReference
      ? row.deadlock_match_id
      : null,
  };
}

function time(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function groupPublicMatches(matches: PublicMatch[]): PublicMatchGroups {
  const stable = (a: PublicMatch, b: PublicMatch) =>
    (a.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) -
      (b.stage?.sequence_number ?? Number.MAX_SAFE_INTEGER) ||
    (a.match_number ?? Number.MAX_SAFE_INTEGER) -
      (b.match_number ?? Number.MAX_SAFE_INTEGER) ||
    a.public_id.localeCompare(b.public_id);
  const live = matches.filter((match) => match.status === "live").sort(stable);
  const upcoming = matches
    .filter(
      (match) =>
        ["scheduled", "postponed", "cancelled"].includes(match.status) &&
        match.scheduled_at,
    )
    .sort(
      (a, b) =>
        time(a.scheduled_at, Number.MAX_SAFE_INTEGER) -
          time(b.scheduled_at, Number.MAX_SAFE_INTEGER) || stable(a, b),
    );
  const results = matches
    .filter((match) => ["completed", "walkover"].includes(match.status))
    .sort(
      (a, b) =>
        time(b.scheduled_at, Number.MIN_SAFE_INTEGER) -
          time(a.scheduled_at, Number.MIN_SAFE_INTEGER) || stable(a, b),
    );
  const grouped = new Set([...live, ...upcoming, ...results]);
  const unscheduled = matches
    .filter((match) => !grouped.has(match))
    .sort(stable);
  return { live, upcoming, results, unscheduled };
}

function toPublicTournament(
  row: PublishedTournament,
): PublicTournamentOverview {
  return {
    slug: row.slug,
    tournament_name: row.tournament_name,
    description: row.description,
    organizer_name: row.organizer_name,
    region: row.region,
    language: row.language,
    start_date: row.start_date,
    end_date: row.end_date,
    timezone: row.timezone,
    format: row.format,
    prize_pool_text: row.prize_pool_text,
    registration_url: safePublicUrl(row.registration_url),
    bracket_url: safePublicUrl(row.bracket_url),
    discord_url: safePublicUrl(row.discord_url),
    stream_url: safePublicUrl(row.stream_url),
    rules_url: safePublicUrl(row.rules_url),
    is_online: row.is_online,
    max_teams: row.max_teams,
    registration_deadline: row.registration_deadline,
    source_updated_at: row.source_updated_at,
  };
}

export function getPublicTournamentOperationalSummary(
  stages: PublicStage[],
  teams: PublicTeam[],
  matches: PublicMatchGroups,
): PublicOperationalSummary {
  return {
    stages: stages.length,
    teams: teams.length,
    upcoming_matches: matches.upcoming.length,
    completed_matches: matches.results.length,
    live_match: matches.live[0] ?? null,
    next_match: matches.upcoming[0] ?? null,
    recent_results: matches.results.slice(0, 3),
  };
}

export function toPublicTournamentProjection(input: {
  locale: Locale;
  tournament: PublishedTournament;
  stageRows: PublicStageRow[];
  teamRows: PublicTeamRow[];
  rosterRows: PublicRosterRow[];
  matchRows: PublicMatchRow[];
}): PublicTournamentProjection {
  const stages = input.stageRows
    .filter((row) => row.is_public)
    .sort(
      (a, b) =>
        a.sequence_number - b.sequence_number || a.slug.localeCompare(b.slug),
    )
    .map(toPublicStage);
  const publicTeamRows = input.teamRows
    .filter((row) => row.is_public)
    .sort(
      (a, b) =>
        (a.seed ?? Number.MAX_SAFE_INTEGER) -
          (b.seed ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name),
    );
  const teams = publicTeamRows.map((row) =>
    toPublicTeam(row, input.rosterRows),
  );
  const publicMatchStatuses = new Set([
    "scheduled",
    "live",
    "completed",
    "postponed",
    "cancelled",
    "walkover",
  ]);
  const visibleRows = input.matchRows.filter(
    (row) =>
      row.is_public &&
      publicMatchStatuses.has(row.status) &&
      (row.status !== "cancelled" ||
        (row.scheduled_at !== null &&
          (row.team_a_id !== null || row.team_b_id !== null))),
  );
  const matches = groupPublicMatches(
    visibleRows.map((row, ordinal) =>
      toPublicMatch(
        row,
        input.stageRows.filter((stage) => stage.is_public),
        publicTeamRows,
        ordinal,
        input.tournament.timezone,
      ),
    ),
  );
  return {
    locale: input.locale,
    tournament: toPublicTournament(input.tournament),
    stages,
    teams,
    matches,
    summary: getPublicTournamentOperationalSummary(stages, teams, matches),
  };
}
