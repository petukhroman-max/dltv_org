import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireSupabaseAdminEnv } from "@/lib/server-env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = requireSupabaseAdminEnv();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });
}
