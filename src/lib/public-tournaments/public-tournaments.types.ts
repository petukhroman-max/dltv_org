import type { TableRow } from "@/lib/supabase/database.types";

export type PublishedTournament = TableRow<"published_tournaments">;
export type TournamentLifecycle = "upcoming" | "ongoing" | "completed";

export type PublishedTournamentFilters = {
  lifecycle?: TournamentLifecycle | "all";
  region?: string;
  page?: number;
  limit?: number;
};

export type PublishedTournamentPage = {
  tournaments: PublishedTournament[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
