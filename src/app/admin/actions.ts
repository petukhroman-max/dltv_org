"use server";

import "server-only";

import { redirect } from "next/navigation";

import { defaultLocale, isLocale, localizePath } from "@/i18n/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logoutAdminAction(requestedLocale?: string) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  redirect(localizePath(locale, "/admin/login"));
}
