import "server-only";

import { z } from "zod";

import { submissionEventInputSchema } from "@/lib/domain/submission";
import { toRepositoryError } from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export async function appendSubmissionEvent(input: unknown) {
  const parsed = submissionEventInputSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submission_events")
    .insert({ ...parsed, metadata: parsed.metadata as Json })
    .select()
    .single();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}

export async function listSubmissionEvents(submissionId: string) {
  const parsedId = z.uuid().parse(submissionId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("submission_events")
    .select()
    .eq("submission_id", parsedId)
    .order("created_at", { ascending: true });

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}
