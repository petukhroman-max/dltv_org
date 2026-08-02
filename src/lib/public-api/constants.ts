export const API_VERSION = "v1" as const;
export const API_TERMS_VERSION = "2026-08-v1" as const;
export const API_PROVIDER = "DLTV" as const;
export const API_PROVIDER_URL = "https://deadlock.one" as const;
export const API_ATTRIBUTION_TEXT = "Data provided by DLTV" as const;

export const apiEndpointNames = [
  "tournaments.list",
  "tournaments.detail",
  "stages.list",
  "teams.list",
  "matches.list",
  "bracket.read",
  "standings.read",
] as const;

export type ApiEndpointName = (typeof apiEndpointNames)[number];

export const API_DEFAULT_ENDPOINTS: ApiEndpointName[] = [...apiEndpointNames];
