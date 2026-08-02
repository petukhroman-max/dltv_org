import "server-only";

import type { NextRequest } from "next/server";

import {
  apiEndpointNames,
  type ApiEndpointName,
} from "@/lib/public-api/constants";
import {
  apiKeyHashesEqual,
  hashApiKey,
  isApiKeyFormat,
  requireApiKeyPepper,
} from "@/lib/public-api/key-security";
import type {
  ApiClientAccessContext,
  ApiErrorCode,
} from "@/lib/public-api/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TableRow } from "@/lib/supabase/database.types";

type ApiKey = TableRow<"api_keys">;
type ApiClient = TableRow<"api_clients">;

export type RateLimitResult = {
  allowed: boolean;
  minute_remaining: number;
  day_remaining: number;
};

type AuthDependencies = {
  pepper: () => string;
  findKey: (hash: string) => Promise<ApiKey | null>;
  findClient: (id: string) => Promise<ApiClient | null>;
  consumeRateLimit: (
    client: ApiClient,
    key: ApiKey,
  ) => Promise<RateLimitResult>;
};

export type ApiAuthenticationResult =
  | { ok: true; context: ApiClientAccessContext }
  | {
      ok: false;
      status: 401 | 403 | 429 | 500;
      code: ApiErrorCode;
      context?: ApiClientAccessContext;
    };

function extractBearerToken(request: Pick<NextRequest, "headers">) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
}

async function findKey(hash: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error) throw new Error("API key lookup failed");
  return data;
}

async function findClient(id: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("API client lookup failed");
  return data;
}

async function consumeRateLimit(client: ApiClient, key: ApiKey) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "consume_api_rate_limit",
    {
      p_client_id: client.id,
      p_api_key_id: key.id,
      p_limit_per_minute: client.default_rate_limit_per_minute,
      p_limit_per_day: client.default_rate_limit_per_day,
    },
  );
  if (error) throw new Error("API rate limit check failed");
  return data as RateLimitResult;
}

const defaultDependencies: AuthDependencies = {
  pepper: requireApiKeyPepper,
  findKey,
  findClient,
  consumeRateLimit,
};

export async function authenticateApiRequest(
  request: Pick<NextRequest, "headers">,
  endpoint: ApiEndpointName,
  dependencies: AuthDependencies = defaultDependencies,
): Promise<ApiAuthenticationResult> {
  const token = extractBearerToken(request);
  if (!token) return { ok: false, status: 401, code: "API_KEY_REQUIRED" };
  if (!isApiKeyFormat(token))
    return { ok: false, status: 401, code: "INVALID_API_KEY" };

  try {
    const computedHash = hashApiKey(token, dependencies.pepper());
    const key = await dependencies.findKey(computedHash);
    if (!key || !apiKeyHashesEqual(computedHash, key.key_hash))
      return { ok: false, status: 401, code: "INVALID_API_KEY" };
    const client = await dependencies.findClient(key.client_id);
    if (!client) return { ok: false, status: 401, code: "INVALID_API_KEY" };
    const allowedEndpoints = (
      client.allowed_endpoints ?? apiEndpointNames
    ).filter((value): value is ApiEndpointName =>
      apiEndpointNames.includes(value as ApiEndpointName),
    );
    const baseContext: ApiClientAccessContext = {
      clientId: client.id,
      apiKeyId: key.id,
      clientSlug: client.client_slug,
      allowedEndpoints,
      rateLimitPerMinute: client.default_rate_limit_per_minute,
      rateLimitPerDay: client.default_rate_limit_per_day,
      attributionStatus:
        client.attribution_status as ApiClientAccessContext["attributionStatus"],
      allowedOrigins: client.allowed_origins ?? [],
      rateLimit: {
        minuteRemaining: client.default_rate_limit_per_minute,
        dayRemaining: client.default_rate_limit_per_day,
      },
    };
    if (key.status === "revoked")
      return {
        ok: false,
        status: 403,
        code: "API_KEY_REVOKED",
        context: baseContext,
      };
    if (key.status === "suspended")
      return {
        ok: false,
        status: 403,
        code: "API_KEY_SUSPENDED",
        context: baseContext,
      };
    if (key.status === "expired")
      return {
        ok: false,
        status: 401,
        code: "API_KEY_EXPIRED",
        context: baseContext,
      };
    if (key.status !== "active")
      return {
        ok: false,
        status: 401,
        code: "INVALID_API_KEY",
        context: baseContext,
      };
    if (key.expires_at && Date.parse(key.expires_at) <= Date.now())
      return {
        ok: false,
        status: 401,
        code: "API_KEY_EXPIRED",
        context: baseContext,
      };
    if (client.status !== "active")
      return {
        ok: false,
        status: 403,
        code: "API_CLIENT_SUSPENDED",
        context: baseContext,
      };
    const rateLimit = await dependencies.consumeRateLimit(client, key);
    const context = {
      ...baseContext,
      rateLimit: {
        minuteRemaining: rateLimit.minute_remaining,
        dayRemaining: rateLimit.day_remaining,
      },
    };
    if (!rateLimit.allowed)
      return { ok: false, status: 429, code: "RATE_LIMIT_EXCEEDED", context };
    if (!allowedEndpoints.includes(endpoint))
      return { ok: false, status: 403, code: "ENDPOINT_NOT_ALLOWED", context };
    return {
      ok: true,
      context,
    };
  } catch {
    return { ok: false, status: 500, code: "INTERNAL_API_ERROR" };
  }
}
