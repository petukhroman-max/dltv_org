import "server-only";

import { z } from "zod";

import { toRepositoryError } from "@/lib/repositories/repository-error";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getAdminUserByUserId(userId: string) {
  const parsedUserId = z.uuid().parse(userId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,email,created_at")
    .eq("user_id", parsedUserId)
    .maybeSingle();

  if (error) {
    throw toRepositoryError(error);
  }

  return data;
}
