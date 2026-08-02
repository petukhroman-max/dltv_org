import type { ApiEndpointName } from "@/lib/public-api/constants";

export type ApiClientAccessContext = {
  clientId: string;
  apiKeyId: string;
  clientSlug: string;
  allowedEndpoints: ApiEndpointName[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  attributionStatus:
    | "not_reviewed"
    | "compliant"
    | "non_compliant"
    | "grace_period";
  allowedOrigins: string[];
  rateLimit: {
    minuteRemaining: number;
    dayRemaining: number;
  };
};

export type ApiErrorCode =
  | "API_KEY_REQUIRED"
  | "INVALID_API_KEY"
  | "API_KEY_EXPIRED"
  | "API_KEY_REVOKED"
  | "API_KEY_SUSPENDED"
  | "API_CLIENT_SUSPENDED"
  | "ENDPOINT_NOT_ALLOWED"
  | "RATE_LIMIT_EXCEEDED"
  | "INVALID_CURSOR"
  | "INVALID_FILTER"
  | "TOURNAMENT_NOT_FOUND"
  | "RESOURCE_NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CORS_PREFLIGHT_DENIED"
  | "RESPONSE_TOO_LARGE"
  | "INTERNAL_API_ERROR";
