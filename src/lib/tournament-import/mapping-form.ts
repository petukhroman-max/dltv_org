import type { ImportColumnMapping } from "./column-mapping";

const value = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim() || null;

export function importMappingFromFormData(
  formData: FormData,
): ImportColumnMapping {
  return {
    teamSheet: value(formData, "teamSheet") ?? "Teams",
    playerSheet: value(formData, "playerSheet"),
    matchSheet: value(formData, "matchSheet") ?? "Matches",
    teams: {
      teamName: value(formData, "teamName") ?? "Team",
      shortName: value(formData, "shortName"),
      region: value(formData, "region"),
      seed: value(formData, "seed"),
      group: value(formData, "teamGroup"),
    },
    players: {
      displayName: value(formData, "displayName") ?? "Player",
      team: value(formData, "playerTeam") ?? "Team",
      role: value(formData, "role") ?? "Role",
      captain: value(formData, "captain"),
      country: value(formData, "country"),
      platformId: value(formData, "platformId"),
    },
    matches: {
      stage: value(formData, "stage") ?? "Stage",
      group: value(formData, "matchGroup"),
      round: value(formData, "round"),
      matchNumber: value(formData, "matchNumber"),
      teamA: value(formData, "teamA") ?? "Team A",
      teamB: value(formData, "teamB") ?? "Team B",
      scheduledDateTime: value(formData, "scheduledDateTime"),
      timezone: value(formData, "timezone"),
      bestOf: value(formData, "bestOf"),
      scoreA: value(formData, "scoreA"),
      scoreB: value(formData, "scoreB"),
      status: value(formData, "status"),
      deadlockMatchId: value(formData, "deadlockMatchId"),
      stream: value(formData, "stream"),
      vod: value(formData, "vod"),
    },
  };
}
