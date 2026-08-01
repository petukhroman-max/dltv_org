import { z } from "zod";

const column = z.string().trim().min(1).max(100).nullable().default(null);
const requiredColumn = z.string().trim().min(1).max(100);
export const importColumnMappingSchema = z.object({
  teamSheet: requiredColumn,
  playerSheet: column,
  matchSheet: requiredColumn,
  teams: z.object({
    teamName: requiredColumn,
    shortName: column,
    region: column,
    seed: column,
    group: column,
  }),
  players: z.object({
    displayName: requiredColumn,
    team: requiredColumn,
    role: requiredColumn,
    captain: column,
    country: column,
    platformId: column,
  }),
  matches: z.object({
    stage: requiredColumn,
    group: column,
    round: column,
    matchNumber: column,
    teamA: requiredColumn,
    teamB: requiredColumn,
    scheduledDateTime: column,
    timezone: column,
    bestOf: column,
    scoreA: column,
    scoreB: column,
    status: column,
    deadlockMatchId: column,
    stream: column,
    vod: column,
  }),
});
export type ImportColumnMapping = z.infer<typeof importColumnMappingSchema>;
