import "server-only";

import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";

import { authenticateApiRequest } from "@/lib/public-api/auth";
import type { ApiEndpointName } from "@/lib/public-api/constants";
import { apiError, apiSuccess } from "@/lib/public-api/response";
import type {
  ApiClientAccessContext,
  ApiErrorCode,
} from "@/lib/public-api/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ApiHandlerResult = {
  data: unknown;
  status?: number;
  pagination?: {
    next_cursor: string | null;
    has_more: boolean;
    limit: number;
  };
};
const MAX_API_RESPONSE_BYTES = 2 * 1024 * 1024;

function safeHeader(value: string | null, maxLength: number) {
  if (!value) return null;
  return (
    value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength) || null
  );
}

function safeOriginHeader(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

async function logUsage(input: {
  request: NextRequest;
  requestId: string;
  endpoint: ApiEndpointName;
  context: ApiClientAccessContext;
  status: number;
  durationMs: number;
  responseBytes: number;
}) {
  const client = createSupabaseAdminClient();
  const { error } = await client.from("api_usage_logs").insert({
    client_id: input.context.clientId,
    api_key_id: input.context.apiKeyId,
    request_id: input.requestId,
    api_version: "v1",
    endpoint: input.endpoint,
    method: "GET",
    response_status: input.status,
    duration_ms: input.durationMs,
    response_bytes: input.responseBytes,
    rate_limit_bucket: "client+key:minute+day",
    user_agent_safe: safeHeader(input.request.headers.get("user-agent"), 256),
    origin_safe: safeOriginHeader(input.request.headers.get("origin")),
  });
  if (error) throw new Error("API usage log failed");
  await client
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", input.context.apiKeyId);
}

export async function withApiAuth(
  request: NextRequest,
  endpoint: ApiEndpointName,
  handler: (context: ApiClientAccessContext) => Promise<ApiHandlerResult>,
) {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const authentication = await authenticateApiRequest(request, endpoint);
  if (!authentication.ok) {
    const response = apiError(
      authentication.code,
      authentication.status,
      requestId,
    );
    if (!authentication.context) return response;
    return finalizeAuthenticatedResponse(
      request,
      endpoint,
      requestId,
      startedAt,
      authentication.context,
      response,
    );
  }

  let response;
  try {
    const result = await handler(authentication.context);
    if (
      new TextEncoder().encode(JSON.stringify(result.data)).byteLength >
      MAX_API_RESPONSE_BYTES
    )
      throw new ApiRequestError("RESPONSE_TOO_LARGE", 413);
    response = apiSuccess(
      result.data,
      requestId,
      authentication.context,
      result.status,
      result.pagination,
    );
  } catch (error) {
    const known = error instanceof ApiRequestError ? error : null;
    response = apiError(
      known?.code ?? "INTERNAL_API_ERROR",
      known?.status ?? 500,
      requestId,
    );
  }

  return finalizeAuthenticatedResponse(
    request,
    endpoint,
    requestId,
    startedAt,
    authentication.context,
    response,
  );
}

async function finalizeAuthenticatedResponse(
  request: NextRequest,
  endpoint: ApiEndpointName,
  requestId: string,
  startedAt: number,
  context: ApiClientAccessContext,
  response: Response,
) {
  response.headers.set("X-RateLimit-Limit", String(context.rateLimitPerMinute));
  response.headers.set(
    "X-RateLimit-Remaining",
    String(context.rateLimit.minuteRemaining),
  );
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.floor(Date.now() / 60000) * 60 + 60),
  );
  const origin = request.headers.get("origin");
  if (origin && context.allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  try {
    await logUsage({
      request,
      requestId,
      endpoint,
      context,
      status: response.status,
      durationMs: Math.max(0, Date.now() - startedAt),
      responseBytes: new TextEncoder().encode(await response.clone().text())
        .byteLength,
    });
  } catch {
    console.error("Public API usage logging failed", { requestId, endpoint });
  }
  return response;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly code: Extract<
      ApiErrorCode,
      | "INVALID_CURSOR"
      | "INVALID_FILTER"
      | "TOURNAMENT_NOT_FOUND"
      | "RESOURCE_NOT_FOUND"
      | "RESPONSE_TOO_LARGE"
    >,
    public readonly status: 400 | 404 | 413,
  ) {
    super(code);
  }
}
