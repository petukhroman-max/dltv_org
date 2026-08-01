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
  PublicProjectionWarningCode,
  PublicStructureRows,
} from "@/lib/public-tournaments/public-operational.types";

type ProjectionWarning = (code: PublicProjectionWarningCode) => void;

function sanitizePublicUrl(
  value: string | null,
  onWarning?: ProjectionWarning,
) {
  const sanitized = safePublicUrl(value);
  if (value && !sanitized) onWarning?.("invalid_public_url");
  return sanitized;
}

export function toPublicStage(row: PublicStageRow): PublicStage {
  return {
    name: row.name,
    slug: row.slug,
    stage_type: row.stage_type,
    bracket_type: row.bracket_type ?? null,
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

function toPublicTeamSummary(
  row: PublicTeamRow,
  onWarning?: ProjectionWarning,
): PublicTeamSummary {
  return {
    name: row.name,
    short_name: row.short_name,
    slug: row.slug,
    logo_url: sanitizePublicUrl(row.logo_url, onWarning),
  };
}

export function toPublicTeam(
  row: PublicTeamRow,
  roster: PublicRosterRow[],
  onWarning?: ProjectionWarning,
): PublicTeam {
  const publicRoles = new Set(["player", "substitute", "coach", "manager"]);
  return {
    name: row.name,
    short_name: row.short_name,
    slug: row.slug,
    logo_url: sanitizePublicUrl(row.logo_url, onWarning),
    region: row.region,
    seed: row.seed,
    status: row.status,
    roster: roster
      .filter(
        (member) =>
          member.tournament_team_id === row.id &&
          member.is_active &&
          member.player.is_public &&
          publicRoles.has(member.role),
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
    return `${context} · Match ${row.match_number}`;
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
  onWarning?: ProjectionWarning,
): PublicMatch {
  const stage = stages.find((candidate) => candidate.id === row.stage_id);
  const teamA = teams.find((candidate) => candidate.id === row.team_a_id);
  const teamB = teams.find((candidate) => candidate.id === row.team_b_id);
  const winnerIsParticipant =
    row.winner_team_id !== null &&
    [row.team_a_id, row.team_b_id].includes(row.winner_team_id);
  const winner = winnerIsParticipant
    ? teams.find((candidate) => candidate.id === row.winner_team_id)
    : undefined;
  if (row.stage_id && !stage) onWarning?.("match_stage_not_public");
  if ((row.team_a_id && !teamA) || (row.team_b_id && !teamB))
    onWarning?.("match_team_not_public");
  if (row.winner_team_id && !winner)
    onWarning?.("match_winner_not_participant");
  const validScheduledAt =
    row.scheduled_at === null || !Number.isNaN(Date.parse(row.scheduled_at));
  if (!validScheduledAt) onWarning?.("match_invalid_schedule");
  const scoreIsValid =
    row.score_a === null && row.score_b === null
      ? true
      : Number.isInteger(row.score_a) &&
        Number.isInteger(row.score_b) &&
        row.score_a !== null &&
        row.score_b !== null &&
        row.score_a >= 0 &&
        row.score_b >= 0;
  if (!scoreIsValid) onWarning?.("match_invalid_score");
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
    bracket_section: row.bracket_section ?? null,
    bracket_round: row.bracket_round ?? null,
    bracket_position: row.bracket_position ?? null,
    scheduled_at: validScheduledAt ? row.scheduled_at : null,
    timezone: stage?.timezone ?? tournamentTimezone,
    best_of: row.best_of,
    team_a: teamA ? toPublicTeamSummary(teamA, onWarning) : null,
    team_b: teamB ? toPublicTeamSummary(teamB, onWarning) : null,
    score_a: scoreIsValid ? row.score_a : null,
    score_b: scoreIsValid ? row.score_b : null,
    status: row.status,
    winner: winner ? toPublicTeamSummary(winner, onWarning) : null,
    stream_url: sanitizePublicUrl(row.stream_url, onWarning),
    vod_url: sanitizePublicUrl(row.vod_url, onWarning),
    duration_seconds:
      row.duration_seconds && row.duration_seconds > 0
        ? row.duration_seconds
        : null,
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
  onWarning?: ProjectionWarning,
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
    registration_url: sanitizePublicUrl(row.registration_url, onWarning),
    bracket_url: sanitizePublicUrl(row.bracket_url, onWarning),
    discord_url: sanitizePublicUrl(row.discord_url, onWarning),
    stream_url: sanitizePublicUrl(row.stream_url, onWarning),
    rules_url: sanitizePublicUrl(row.rules_url, onWarning),
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
    live_matches: matches.live.length,
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
  structureRows?: PublicStructureRows;
  onWarning?: ProjectionWarning;
}): PublicTournamentProjection {
  const stages = input.stageRows
    .filter(
      (row) =>
        row.is_public && row.submission_id === input.tournament.submission_id,
    )
    .sort(
      (a, b) =>
        a.sequence_number - b.sequence_number || a.slug.localeCompare(b.slug),
    )
    .map(toPublicStage);
  const publicTeamRows = input.teamRows
    .filter(
      (row) =>
        row.is_public && row.submission_id === input.tournament.submission_id,
    )
    .sort(
      (a, b) =>
        (a.seed ?? Number.MAX_SAFE_INTEGER) -
          (b.seed ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name),
    );
  const teams = publicTeamRows.map((row) => {
    const unsafeRoleCount = input.rosterRows.filter(
      (member) =>
        member.tournament_team_id === row.id &&
        member.is_active &&
        member.player.is_public &&
        !["player", "substitute", "coach", "manager"].includes(member.role),
    ).length;
    if (unsafeRoleCount) input.onWarning?.("roster_role_not_public");
    return toPublicTeam(row, input.rosterRows, input.onWarning);
  });
  const publicMatchStatuses = new Set([
    "scheduled",
    "live",
    "completed",
    "postponed",
    "cancelled",
    "walkover",
  ]);
  const visibleRows = input.matchRows.filter((row) => {
    const isVisible =
      row.is_public &&
      row.submission_id === input.tournament.submission_id &&
      publicMatchStatuses.has(row.status) &&
      (row.status !== "cancelled" ||
        (row.scheduled_at !== null &&
          (row.team_a_id !== null || row.team_b_id !== null)));
    if (!isVisible) return false;
    if (
      row.status === "completed" &&
      (!Number.isInteger(row.score_a) ||
        !Number.isInteger(row.score_b) ||
        row.score_a === null ||
        row.score_b === null ||
        row.score_a < 0 ||
        row.score_b < 0)
    ) {
      input.onWarning?.("completed_match_incomplete_score");
      return false;
    }
    return true;
  });
  const publicMatches = visibleRows.map((row, ordinal) =>
    toPublicMatch(
      row,
      input.stageRows.filter(
        (stage) =>
          stage.is_public &&
          stage.submission_id === input.tournament.submission_id,
      ),
      publicTeamRows,
      ordinal,
      input.tournament.timezone,
      input.onWarning,
    ),
  );
  const matches = groupPublicMatches(publicMatches);
  const structures = input.structureRows ?? {
    bracketLinks: [],
    standingsByStage: {},
  };
  const publicStages = input.stageRows.filter(
    (stage) =>
      stage.is_public && stage.submission_id === input.tournament.submission_id,
  );
  const brackets = publicStages.flatMap((stage) => {
    const bracketType =
      stage.bracket_type ??
      (["single_elimination", "double_elimination"].includes(stage.stage_type)
        ? stage.stage_type
        : null);
    if (!bracketType) return [];
    const sectionOrder: Record<string, number> = {
      main: 0,
      winners: 0,
      losers: 1,
      third_place: 2,
      grand_final: 3,
    };
    const rows = visibleRows
      .filter(
        (row) =>
          row.stage_id === stage.id &&
          row.bracket_section &&
          row.bracket_round &&
          row.bracket_position,
      )
      .sort(
        (a, b) =>
          (sectionOrder[a.bracket_section ?? ""] ?? 99) -
            (sectionOrder[b.bracket_section ?? ""] ?? 99) ||
          (a.bracket_round ?? 0) - (b.bracket_round ?? 0) ||
          (a.bracket_position ?? 0) - (b.bracket_position ?? 0) ||
          (a.match_number ?? 0) - (b.match_number ?? 0),
      );
    if (!rows.length) return [];
    const projected = rows
      .map((row) => publicMatches[visibleRows.indexOf(row)])
      .filter(Boolean);
    const publicId = new Map(
      rows.map((row, index) => [row.id, projected[index]?.public_id]),
    );
    return [
      {
        stage: { name: stage.name, slug: stage.slug },
        bracket_type: bracketType,
        matches: projected,
        links: structures.bracketLinks
          .filter(
            (link) =>
              link.stage_id === stage.id &&
              publicId.has(link.source_match_id) &&
              publicId.has(link.target_match_id),
          )
          .map((link) => ({
            source: publicId.get(link.source_match_id)!,
            outcome: link.outcome,
            target: publicId.get(link.target_match_id)!,
            target_slot: link.target_slot,
          })),
      },
    ];
  });
  const standings = publicStages.flatMap((stage) => {
    if (
      !["qualifier", "group_stage", "round_robin", "custom"].includes(
        stage.stage_type,
      )
    )
      return [];
    const rows = (structures.standingsByStage[stage.id] ?? []).filter((row) =>
      publicTeamRows.some((team) => team.id === row.team_id),
    );
    if (!rows.length) return [];
    const groupNames = [...new Set(rows.map((row) => row.group_name))].sort();
    return [
      {
        stage: { name: stage.name, slug: stage.slug },
        groups: groupNames.map((name) => ({
          name,
          rows: rows
            .filter((row) => row.group_name === name)
            .map((row) => ({
              team_name: row.team_name,
              team_slug: row.team_slug,
              seed: row.seed,
              played: row.played,
              wins: row.wins,
              losses: row.losses,
              score_for: row.score_for,
              score_against: row.score_against,
              score_diff: row.score_diff,
              points: row.points,
              rank: row.rank,
              qualified: row.qualified,
              public_note: row.public_note,
            })),
        })),
      },
    ];
  });
  return {
    locale: input.locale,
    tournament: toPublicTournament(input.tournament, input.onWarning),
    stages,
    teams,
    matches,
    brackets,
    standings,
    summary: getPublicTournamentOperationalSummary(stages, teams, matches),
  };
}
