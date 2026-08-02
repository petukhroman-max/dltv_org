import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { apiError } from "@/lib/public-api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const allowedHeaders = new Set(["authorization", "content-type"]);

async function defaultOriginAllowed(origin: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_clients")
    .select("id")
    .eq("status", "active")
    .contains("allowed_origins", [origin])
    .limit(1);
  if (error) throw new Error("CORS origin lookup failed");
  return Boolean(data?.length);
}

export async function handleApiOptions(
  request: NextRequest,
  isOriginAllowed: (origin: string) => Promise<boolean> = defaultOriginAllowed,
) {
  const requestId = randomUUID();
  const origin = request.headers.get("origin");
  const requestedMethod = request.headers.get("access-control-request-method");
  const requestedHeaders = (
    request.headers.get("access-control-request-headers") ?? ""
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  let safeOrigin = false;
  try {
    safeOrigin = Boolean(
      origin &&
        ["http:", "https:"].includes(new URL(origin).protocol) &&
        origin.length <= 2048,
    );
  } catch {
    safeOrigin = false;
  }
  if (
    !safeOrigin ||
    requestedMethod !== "GET" ||
    requestedHeaders.some((header) => !allowedHeaders.has(header))
  )
    return apiError("CORS_PREFLIGHT_DENIED", 403, requestId);

  let allowed = false;
  try {
    allowed = await isOriginAllowed(origin!);
  } catch {
    return apiError("INTERNAL_API_ERROR", 500, requestId);
  }
  if (!allowed) return apiError("CORS_PREFLIGHT_DENIED", 403, requestId);

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin!,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
      "X-Request-ID": requestId,
    },
  });
}
