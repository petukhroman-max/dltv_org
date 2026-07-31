"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = requirePublicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
