import "server-only";

import { z } from "zod";

import type { Locale } from "@/i18n/config";
import { createApiCursor, parseApiCursor } from "@/lib/public-api/cursor";
import { ApiRequestError } from "@/lib/public-api/http";
import { getPublicTournamentProjection } from "@/lib/public-tournaments/public-operational.service";
import type {
  PublicMatch,
  PublicTournamentProjection,
} from "@/lib/public-tournaments/public-operational.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);
const cursor = z.string().regex(/^[A-Za-z0-9_.-]{1,500}$/);

const tournamentQuerySchema = z
  .object({
    status: z.enum(["upcoming", "ongoing", "completed"]).optional(),
    date_from: date.optional(),
    date_to: date.optional(),
    region: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: cursor.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.date_from || !value.date_to || value.date_from <= value.date_to,
    { path: ["date_to"] },
  );

const matchQuerySchema = z
  .object({
    status: z
      .enum([
        "scheduled",
        "live",
        "completed",
        "postponed",
        "cancelled",
        "walkover",
      ])
      .optional(),
    stage: slug.optional(),
    team: slug.optional(),
    date_from: date.optional(),
    date_to: date.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: cursor.optional(),
  })
  .strict()
  .refine(
    (value) =>
      !value.date_from || !value.date_to || value.date_from <= value.date_to,
    { path: ["date_to"] },
  );

const projectionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    cursor: cursor.optional(),
  })
  .strict();

function paramsObject(searchParams: URLSearchParams) {
  return Object.fromEntries(searchParams.entries());
}

const privateUrlParameters = new Set([
  "access_token",
  "api_key",
  "auth",
  "code",
  "key",
  "secret",
  "sig",
  "signature",
  "token",
]);

export function safeApiUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (
      [...url.searchParams.keys()].some((key) =>
        privateUrlParameters.has(key.toLowerCase()),
      )
    )
      return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function tournamentOverview(row: {
  slug: string;
  tournament_name: string;
  description: string | null;
  organizer_name: string;
  region: string;
  language: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  format: string | null;
  prize_pool_text: string | null;
  registration_url: string | null;
  bracket_url: string | null;
  discord_url: string | null;
  stream_url: string | null;
  rules_url: string | null;
  is_online: boolean;
  max_teams: number | null;
  registration_deadline: string | null;
  source_updated_at: string;
}) {
  const { source_updated_at: _internalSourceTimestamp, ...safe } = row;
  void _internalSourceTimestamp;
  return {
    ...safe,
    registration_url: safeApiUrl(safe.registration_url),
    bracket_url: safeApiUrl(safe.bracket_url),
    discord_url: safeApiUrl(safe.discord_url),
    stream_url: safeApiUrl(safe.stream_url),
    rules_url: safeApiUrl(safe.rules_url),
  };
}

function toApiTeamSummary<T extends { logo_url: string | null }>(team: T) {
  return { ...team, logo_url: safeApiUrl(team.logo_url) };
}

export function toApiTeam<T extends { logo_url: string | null }>(team: T) {
  return toApiTeamSummary(team);
}

export function toApiMatch(match: PublicMatch) {
  const { deadlock_match_id: _internalReference, ...safe } = match;
  void _internalReference;
  return {
    ...safe,
    team_a: safe.team_a ? toApiTeamSummary(safe.team_a) : null,
    team_b: safe.team_b ? toApiTeamSummary(safe.team_b) : null,
    winner: safe.winner ? toApiTeamSummary(safe.winner) : null,
    stream_url: safeApiUrl(safe.stream_url),
    vod_url: safeApiUrl(safe.vod_url),
  };
}

export function toApiTournamentDetails(projection: PublicTournamentProjection) {
  const { source_updated_at: _internalSourceTimestamp, ...tournament } =
    projection.tournament;
  void _internalSourceTimestamp;
  const map = (match: PublicMatch | null) => (match ? toApiMatch(match) : null);
  return {
    tournament: {
      ...tournament,
      registration_url: safeApiUrl(tournament.registration_url),
      bracket_url: safeApiUrl(tournament.bracket_url),
      discord_url: safeApiUrl(tournament.discord_url),
      stream_url: safeApiUrl(tournament.stream_url),
      rules_url: safeApiUrl(tournament.rules_url),
    },
    summary: {
      ...projection.summary,
      live_match: map(projection.summary.live_match),
      next_match: map(projection.summary.next_match),
      recent_results: projection.summary.recent_results.map(toApiMatch),
    },
  };
}

export async function listApiTournaments(url: URL) {
  const parsed = tournamentQuerySchema.safeParse(
    paramsObject(url.searchParams),
  );
  if (!parsed.success) throw new ApiRequestError("INVALID_FILTER", 400);
  const afterSlug = parsed.data.cursor
    ? parseApiCursor(parsed.data.cursor, "tournaments")
    : null;
  if (parsed.data.cursor && !afterSlug)
    throw new ApiRequestError("INVALID_CURSOR", 400);

  const today = new Date().toISOString().slice(0, 10);
  let query = createSupabaseAdminClient()
    .from("published_tournaments")
    .select(
      "slug, tournament_name, description, organizer_name, region, language, start_date, end_date, timezone, format, prize_pool_text, registration_url, bracket_url, discord_url, stream_url, rules_url, is_online, max_teams, registration_deadline, source_updated_at",
    )
    .eq("visibility_status", "published")
    .order("slug", { ascending: true })
    .limit(parsed.data.limit + 1);
  if (afterSlug) query = query.gt("slug", afterSlug);
  if (parsed.data.region) query = query.eq("region", parsed.data.region);
  if (parsed.data.date_from)
    query = query.gte("end_date", parsed.data.date_from);
  if (parsed.data.date_to) query = query.lte("start_date", parsed.data.date_to);
  if (parsed.data.status === "upcoming") query = query.gt("start_date", today);
  if (parsed.data.status === "ongoing")
    query = query.lte("start_date", today).gte("end_date", today);
  if (parsed.data.status === "completed") query = query.lt("end_date", today);
  query = query.abortSignal(AbortSignal.timeout(8_000));

  const { data, error } = await query;
  if (error) throw new Error("Public tournament API query failed");
  const rows = data ?? [];
  const hasMore = rows.length > parsed.data.limit;
  const page = rows.slice(0, parsed.data.limit).map(tournamentOverview);
  return {
    items: page,
    pagination: {
      limit: parsed.data.limit,
      next_cursor:
        hasMore && page.length
          ? createApiCursor("tournaments", page.at(-1)!.slug)
          : null,
      has_more: hasMore,
    },
  };
}

export async function getApiTournament(
  slugValue: string,
  locale: Locale = "en",
) {
  if (!slug.safeParse(slugValue).success)
    throw new ApiRequestError("TOURNAMENT_NOT_FOUND", 404);
  const projection = await getPublicTournamentProjection(slugValue, locale);
  if (!projection) throw new ApiRequestError("TOURNAMENT_NOT_FOUND", 404);
  return projection;
}

export function paginateApiItems<T>(
  items: T[],
  url: URL,
  scope: string,
  publicKey: (item: T) => string,
) {
  const parsed = projectionListQuerySchema.safeParse(
    paramsObject(url.searchParams),
  );
  if (!parsed.success) throw new ApiRequestError("INVALID_FILTER", 400);
  const after = parsed.data.cursor
    ? parseApiCursor(parsed.data.cursor, scope)
    : null;
  if (parsed.data.cursor && !after)
    throw new ApiRequestError("INVALID_CURSOR", 400);
  const start = after
    ? items.findIndex((item) => publicKey(item) === after) + 1
    : 0;
  if (after && start === 0) throw new ApiRequestError("INVALID_CURSOR", 400);
  const page = items.slice(start, start + parsed.data.limit);
  const hasMore = start + parsed.data.limit < items.length;
  return {
    items: page,
    pagination: {
      limit: parsed.data.limit,
      next_cursor:
        hasMore && page.length
          ? createApiCursor(scope, publicKey(page.at(-1)!))
          : null,
      has_more: hasMore,
    },
  };
}

export async function listApiMatches(slugValue: string, url: URL) {
  const parsed = matchQuerySchema.safeParse(paramsObject(url.searchParams));
  if (!parsed.success) throw new ApiRequestError("INVALID_FILTER", 400);
  const afterId = parsed.data.cursor
    ? parseApiCursor(parsed.data.cursor, `matches:${slugValue}`)
    : null;
  if (parsed.data.cursor && !afterId)
    throw new ApiRequestError("INVALID_CURSOR", 400);
  const projection = await getApiTournament(slugValue);
  const matches = [
    ...projection.matches.live,
    ...projection.matches.upcoming,
    ...projection.matches.results,
    ...projection.matches.unscheduled,
  ]
    .filter(
      (match) => !parsed.data.status || match.status === parsed.data.status,
    )
    .filter(
      (match) => !parsed.data.stage || match.stage?.slug === parsed.data.stage,
    )
    .filter(
      (match) =>
        !parsed.data.team ||
        match.team_a?.slug === parsed.data.team ||
        match.team_b?.slug === parsed.data.team,
    )
    .filter(
      (match) =>
        !parsed.data.date_from ||
        (match.scheduled_at?.slice(0, 10) ?? "") >= parsed.data.date_from,
    )
    .filter(
      (match) =>
        !parsed.data.date_to ||
        (match.scheduled_at?.slice(0, 10) ?? "9999") <= parsed.data.date_to,
    )
    .sort((a, b) => a.public_id.localeCompare(b.public_id));
  const start = afterId
    ? matches.findIndex((match) => match.public_id === afterId) + 1
    : 0;
  if (afterId && start === 0) throw new ApiRequestError("INVALID_CURSOR", 400);
  const page = matches.slice(start, start + parsed.data.limit);
  const hasMore = start + parsed.data.limit < matches.length;
  return {
    items: (page as PublicMatch[]).map(toApiMatch),
    pagination: {
      limit: parsed.data.limit,
      next_cursor:
        hasMore && page.length
          ? createApiCursor(`matches:${slugValue}`, page.at(-1)!.public_id)
          : null,
      has_more: hasMore,
    },
  };
}
