import type { Locale } from "@/i18n/config";

export type PublicTournamentOverview = {
  slug: string;
  tournament_name: string;
  description: string | null;
  organizer_name: string;
  region: string;
  language: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  format: string | null;
  prize_pool_text: string | null;
  registration_url: string | null;
  bracket_url: string | null;
  discord_url: string | null;
  stream_url: string | null;
  rules_url: string | null;
  is_online: boolean;
  max_teams: number | null;
  registration_deadline: string | null;
  source_updated_at: string;
};

export type PublicStage = {
  name: string;
  slug: string;
  stage_type: string;
  sequence_number: number;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  format_text: string | null;
  best_of_default: number | null;
  team_count: number | null;
  is_online: boolean | null;
  location_name: string | null;
  status: string;
};

export type PublicRosterMember = {
  display_name: string;
  country_code: string | null;
  role: string;
  is_captain: boolean;
};

export type PublicTeamSummary = {
  name: string;
  short_name: string | null;
  slug: string;
  logo_url: string | null;
};

export type PublicTeam = PublicTeamSummary & {
  region: string | null;
  seed: number | null;
  status: string;
  roster: PublicRosterMember[];
};

export type PublicMatch = {
  public_id: string;
  stage: Pick<PublicStage, "name" | "slug" | "sequence_number"> | null;
  match_number: number | null;
  round_name: string | null;
  group_name: string | null;
  scheduled_at: string | null;
  timezone: string;
  best_of: number | null;
  team_a: PublicTeamSummary | null;
  team_b: PublicTeamSummary | null;
  score_a: number | null;
  score_b: number | null;
  status: string;
  winner: PublicTeamSummary | null;
  stream_url: string | null;
  vod_url: string | null;
  duration_seconds: number | null;
  deadlock_match_id: string | null;
};

export type PublicMatchGroups = {
  live: PublicMatch[];
  upcoming: PublicMatch[];
  results: PublicMatch[];
  unscheduled: PublicMatch[];
};

export type PublicOperationalSummary = {
  stages: number;
  teams: number;
  upcoming_matches: number;
  completed_matches: number;
  live_match: PublicMatch | null;
  next_match: PublicMatch | null;
  recent_results: PublicMatch[];
};

export type PublicTournamentProjection = {
  locale: Locale;
  tournament: PublicTournamentOverview;
  stages: PublicStage[];
  teams: PublicTeam[];
  matches: PublicMatchGroups;
  summary: PublicOperationalSummary;
};

export type PublicStageRow = PublicStage & {
  id: string;
  submission_id: string;
  is_public: boolean;
};

export type PublicTeamRow = Omit<PublicTeam, "roster"> & {
  id: string;
  submission_id: string;
  is_public: boolean;
};

export type PublicRosterRow = {
  tournament_team_id: string;
  role: string;
  is_captain: boolean;
  is_active: boolean;
  player: {
    display_name: string;
    country_code: string | null;
    is_public: boolean;
  };
};

export type PublicMatchRow = {
  id: string;
  submission_id: string;
  stage_id: string | null;
  match_number: number | null;
  round_name: string | null;
  group_name: string | null;
  scheduled_at: string | null;
  best_of: number | null;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_team_id: string | null;
  status: string;
  deadlock_match_id: string | null;
  stream_url: string | null;
  vod_url: string | null;
  duration_seconds: number | null;
  is_public: boolean;
};
