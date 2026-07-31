import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function refreshSupabaseSession(request: NextRequest) {
  const { url, anonKey } = requirePublicSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser validates the token with Supabase Auth and refreshes expired
  // cookies. Authorization remains in requireAdmin().
  await supabase.auth.getUser();
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}
