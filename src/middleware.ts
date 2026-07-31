import { type NextRequest, NextResponse } from "next/server";

import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/edit-submission")) {
    const response = NextResponse.next({ request });
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, max-age=0, must-revalidate",
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/edit-submission/:path*"],
};
