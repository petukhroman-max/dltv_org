import { NextResponse } from "next/server";

import {
  API_ATTRIBUTION_TEXT,
  API_PROVIDER,
  API_PROVIDER_URL,
  API_TERMS_VERSION,
  API_VERSION,
} from "@/lib/public-api/constants";
import type {
  ApiClientAccessContext,
  ApiErrorCode,
} from "@/lib/public-api/types";

function commonHeaders(requestId: string) {
  return {
    "Cache-Control": "private, no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Request-ID": requestId,
    "X-Data-Provider": API_PROVIDER,
    "X-Attribution-Required": "true",
    "X-API-Version": API_VERSION,
    Link: `<${API_PROVIDER_URL}>; rel="canonical", <${API_PROVIDER_URL}/en/api-terms>; rel="terms"`,
  };
}

export function apiSuccess(
  data: unknown,
  requestId: string,
  context?: ApiClientAccessContext,
  status = 200,
  pagination?: {
    next_cursor: string | null;
    has_more: boolean;
    limit: number;
  },
) {
  const response = NextResponse.json(
    {
      data,
      ...(pagination ? { pagination } : {}),
      meta: {
        api_version: API_VERSION,
        provider: API_PROVIDER,
        provider_url: API_PROVIDER_URL,
        attribution_required: true,
        attribution_text: API_ATTRIBUTION_TEXT,
        terms_version: API_TERMS_VERSION,
        request_id: requestId,
        generated_at: new Date().toISOString(),
      },
    },
    { status, headers: commonHeaders(requestId) },
  );
  if (context) {
    response.headers.set(
      "X-RateLimit-Limit",
      String(context.rateLimitPerMinute),
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      String(context.rateLimit.minuteRemaining),
    );
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.floor(Date.now() / 60000) * 60 + 60),
    );
    response.headers.set(
      "X-RateLimit-Limit-Minute",
      String(context.rateLimitPerMinute),
    );
    response.headers.set(
      "X-RateLimit-Remaining-Minute",
      String(context.rateLimit.minuteRemaining),
    );
    response.headers.set(
      "X-RateLimit-Limit-Day",
      String(context.rateLimitPerDay),
    );
    response.headers.set(
      "X-RateLimit-Remaining-Day",
      String(context.rateLimit.dayRemaining),
    );
  }
  return response;
}

const safeMessages: Record<ApiErrorCode, string> = {
  API_KEY_REQUIRED: "An API key is required.",
  INVALID_API_KEY: "The API key is invalid or inactive.",
  API_KEY_EXPIRED: "The API key has expired.",
  API_KEY_REVOKED: "The API key has been revoked.",
  API_KEY_SUSPENDED: "The API key is suspended.",
  API_CLIENT_SUSPENDED: "The API client is suspended or revoked.",
  ENDPOINT_NOT_ALLOWED: "This client cannot access the requested endpoint.",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded. Retry later.",
  INVALID_CURSOR: "The pagination cursor is invalid.",
  INVALID_FILTER: "One or more filters are invalid.",
  TOURNAMENT_NOT_FOUND: "The tournament was not found.",
  RESOURCE_NOT_FOUND: "The requested resource was not found.",
  METHOD_NOT_ALLOWED: "The HTTP method is not supported.",
  CORS_PREFLIGHT_DENIED: "The CORS preflight request is not allowed.",
  RESPONSE_TOO_LARGE: "The requested dataset exceeds the API response limit.",
  INTERNAL_API_ERROR: "The request could not be completed.",
};

export function apiError(
  code: ApiErrorCode,
  status: number,
  requestId: string,
) {
  const response = NextResponse.json(
    { error: { code, message: safeMessages[code], request_id: requestId } },
    { status, headers: commonHeaders(requestId) },
  );
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
