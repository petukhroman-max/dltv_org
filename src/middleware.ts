import { type NextRequest, NextResponse } from "next/server";

import {
  defaultLocale,
  isLocale,
  localizePath,
  stripLocale,
} from "@/i18n/config";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

const LOCALIZED_ROOTS = [
  "/",
  "/submit-tournament",
  "/tournaments",
  "/admin",
  "/edit-submission",
  "/workspace",
] as const;

function shouldLocalize(pathname: string) {
  return LOCALIZED_ROOTS.some((root) =>
    root === "/"
      ? pathname === "/"
      : pathname === root || pathname.startsWith(`${root}/`),
  );
}

function isPrivatePath(pathname: string) {
  return ["/admin", "/edit-submission", "/workspace"].some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

function applyPrivateHeaders(response: NextResponse) {
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const firstSegment = pathname.split("/")[1];
  const locale = isLocale(firstSegment) ? firstSegment : null;
  const isInternalLocaleRewrite =
    request.headers.get("x-dltv-internal-locale-rewrite") === "1";

  if (!locale && isInternalLocaleRewrite) return NextResponse.next();

  if (!locale && shouldLocalize(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(defaultLocale, pathname);
    return NextResponse.redirect(url, 308);
  }

  if (!locale) return NextResponse.next();

  const internalPath = stripLocale(pathname);
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = internalPath;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-dltv-locale", locale);
  requestHeaders.set("x-dltv-internal-locale-rewrite", "1");

  let response: NextResponse;
  if (internalPath.startsWith("/admin")) {
    response = await refreshSupabaseSession(
      request,
      rewriteUrl,
      requestHeaders,
    );
  } else {
    response = NextResponse.rewrite(rewriteUrl, {
      request: { headers: requestHeaders },
    });
  }
  response.cookies.set("dltv-locale", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return isPrivatePath(internalPath) ? applyPrivateHeaders(response) : response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
