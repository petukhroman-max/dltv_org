import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Middleware or a Server
          // Action is responsible for refreshing sessions when auth is added.
        }
      },
    },
  });
}
