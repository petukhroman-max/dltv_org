import "server-only";

import { z } from "zod";

import { organizerInputSchema } from "@/lib/domain/submission";
import { toRepositoryError } from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createOrganizer(input: unknown) {
  const parsed = organizerInputSchema.parse(input);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizers")
    .insert(parsed)
    .select()
    .single();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}

export async function getOrganizerById(id: string) {
  const parsedId = z.uuid().parse(id);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("organizers")
    .select()
    .eq("id", parsedId)
    .maybeSingle();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}
