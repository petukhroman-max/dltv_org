import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type {
  PublishedTournament,
  PublishedTournamentFilters,
  PublishedTournamentPage,
  TournamentLifecycle,
} from "@/lib/public-tournaments/public-tournaments.types";
import type { Database } from "@/lib/supabase/database.types";

const filtersSchema = z.object({
  lifecycle: z.enum(["all", "upcoming", "ongoing", "completed"]).default("all"),
  region: z.string().trim().min(1).max(100).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(20).default(20),
});
const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

type CategoryResult = { rows: PublishedTournament[]; count: number };
export type CategoryExecutor = (input: {
  lifecycle: TournamentLifecycle;
  region?: string;
  today: string;
  from: number;
  to: number;
}) => Promise<CategoryResult>;
export type SlugExecutor = (
  slug: string,
) => Promise<PublishedTournament | null>;

function publicClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

async function executeCategory(
  input: Parameters<CategoryExecutor>[0],
): Promise<CategoryResult> {
  let query = publicClient()
    .from("published_tournaments")
    .select("*", { count: "exact" })
    .eq("visibility_status", "published");
  if (input.region) query = query.eq("region", input.region);
  if (input.lifecycle === "upcoming") {
    query = query
      .gt("start_date", input.today)
      .order("start_date", { ascending: true });
  } else if (input.lifecycle === "ongoing") {
    query = query
      .lte("start_date", input.today)
      .gte("end_date", input.today)
      .order("end_date", { ascending: true });
  } else {
    query = query
      .lt("end_date", input.today)
      .order("end_date", { ascending: false });
  }
  const { data, error, count } = await query.range(input.from, input.to);
  if (error) throw new Error("Public tournament query failed");
  return { rows: data ?? [], count: count ?? 0 };
}

async function executeSlug(slug: string): Promise<PublishedTournament | null> {
  const { data, error } = await publicClient()
    .from("published_tournaments")
    .select("*")
    .eq("slug", slug)
    .eq("visibility_status", "published")
    .maybeSingle();
  if (error) throw new Error("Public tournament query failed");
  return data;
}

export async function listPublishedTournaments(
  filters: PublishedTournamentFilters = {},
  execute: CategoryExecutor = executeCategory,
  today = new Date().toISOString().slice(0, 10),
): Promise<PublishedTournamentPage> {
  const parsed = filtersSchema.parse(filters);
  const offset = (parsed.page - 1) * parsed.limit;
  const categories: TournamentLifecycle[] =
    parsed.lifecycle === "all"
      ? ["ongoing", "upcoming", "completed"]
      : [parsed.lifecycle];
  const perCategoryFrom = parsed.lifecycle === "all" ? 0 : offset;
  const perCategoryTo =
    parsed.lifecycle === "all"
      ? offset + parsed.limit - 1
      : offset + parsed.limit - 1;
  const results = await Promise.all(
    categories.map((lifecycle) =>
      execute({
        lifecycle,
        region: parsed.region,
        today,
        from: perCategoryFrom,
        to: perCategoryTo,
      }),
    ),
  );
  const merged = results.flatMap((result) => result.rows);
  const tournaments =
    parsed.lifecycle === "all"
      ? merged.slice(offset, offset + parsed.limit)
      : merged;
  const total = results.reduce((sum, result) => sum + result.count, 0);
  return {
    tournaments,
    total,
    page: parsed.page,
    limit: parsed.limit,
    totalPages: Math.max(1, Math.ceil(total / parsed.limit)),
  };
}

export async function getPublishedTournamentBySlug(
  slug: string,
  execute: SlugExecutor = executeSlug,
): Promise<PublishedTournament | null> {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return execute(parsed.data);
}
