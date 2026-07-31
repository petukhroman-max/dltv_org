import "server-only";

import { z } from "zod";

import {
  createTournamentSubmissionInputSchema,
  listFiltersSchema,
} from "@/lib/domain/submission";
import { toRepositoryError } from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createTournamentSubmission(input: unknown) {
  const parsed = createTournamentSubmissionInputSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tournament_submissions")
    .insert({ ...parsed, status: "draft" })
    .select()
    .single();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}

export async function getTournamentSubmissionById(id: string) {
  const parsedId = z.uuid().parse(id);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tournament_submissions")
    .select()
    .eq("id", parsedId)
    .maybeSingle();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}

export async function listTournamentSubmissions(filters: unknown = {}) {
  const parsed = listFiltersSchema.parse(filters);
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("tournament_submissions")
    .select()
    .order("created_at", { ascending: false })
    .range(parsed.offset, parsed.offset + parsed.limit - 1);

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }
  if (parsed.organizer_id) {
    query = query.eq("organizer_id", parsed.organizer_id);
  }
  if (parsed.start_date_from) {
    query = query.gte("start_date", parsed.start_date_from);
  }
  if (parsed.start_date_to) {
    query = query.lte("start_date", parsed.start_date_to);
  }

  const { data, error } = await query;
  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}
