import type { TournamentLifecycle } from "@/lib/public-tournaments/public-tournaments.types";

export function getTournamentLifecycle(
  startDate: string,
  endDate: string,
  today = new Date().toISOString().slice(0, 10),
): TournamentLifecycle {
  if (today < startDate) return "upcoming";
  if (today > endDate) return "completed";
  return "ongoing";
}
