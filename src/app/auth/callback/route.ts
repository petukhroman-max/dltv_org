import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, isLocale, localizePath } from "@/i18n/config";
import { resolveAuthCallbackDestination } from "@/lib/admin/auth-callback";
import { authorizeAdmin } from "@/lib/admin/authorization";
import { getAdminUserByUserId } from "@/lib/repositories/admin-users";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedLocale = request.nextUrl.searchParams.get("locale");
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const supabase = await createSupabaseServerClient();
  const destination = await resolveAuthCallbackDestination(code, {
    exchangeCodeForSession: async (authCode) => {
      const { error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) {
        throw error;
      }
    },
    authorizeCurrentUser: () =>
      authorizeAdmin({
        getCurrentUser: async () => {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();
          if (error || !user) {
            return null;
          }
          return { id: user.id, email: user.email };
        },
        getAdminUserByUserId,
      }),
  });

  return NextResponse.redirect(
    new URL(localizePath(locale, destination), request.url),
  );
}
