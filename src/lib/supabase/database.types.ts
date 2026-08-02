// Manually maintained bootstrap types. Keep synchronized with Supabase migrations.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type OrganizerRow = {
  id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  discord_username: string | null;
  website_url: string | null;
  created_at: string;
  updated_at: string;
};

type TournamentSubmissionRow = {
  id: string;
  organizer_id: string;
  status: string;
  tournament_name: string;
  description: string | null;
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
  organizer_notes: string | null;
  reviewer_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

type SubmissionEventRow = {
  id: string;
  submission_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  actor_type: string;
  actor_id: string | null;
  metadata: Json;
  created_at: string;
};

type AdminUserRow = {
  user_id: string;
  email: string;
  created_at: string;
};

type SubmissionEditTokenRow = {
  id: string;
  submission_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_by: string;
  created_at: string;
};

type OrganizerWorkspaceTokenRow = {
  id: string;
  submission_id: string;
  token_hash: string;
  label: string | null;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
};

type PublishedTournamentRow = {
  id: string;
  submission_id: string;
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
  visibility_status: string;
  source_updated_at: string;
  published_at: string;
  created_at: string;
  updated_at: string;
};

type TournamentStageRow = {
  id: string;
  submission_id: string;
  name: string;
  slug: string;
  stage_type: string;
  bracket_type?: string | null;
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
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type TournamentTeamRow = {
  id: string;
  submission_id: string;
  name: string;
  short_name: string | null;
  slug: string;
  logo_url: string | null;
  region: string | null;
  seed: number | null;
  status: string;
  external_team_id: string | null;
  source: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type PlayerRow = {
  id: string;
  display_name: string;
  normalized_name: string;
  real_name: string | null;
  country_code: string | null;
  steam_id: string | null;
  deadlock_account_id: string | null;
  external_player_id: string | null;
  source: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type TournamentRosterMemberRow = {
  id: string;
  tournament_team_id: string;
  player_id: string;
  role: string;
  is_captain: boolean;
  is_active: boolean;
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
};

type TournamentMatchRow = {
  id: string;
  submission_id: string;
  stage_id: string | null;
  match_number: number | null;
  round_name: string | null;
  group_name: string | null;
  bracket_section?: string | null;
  bracket_round?: number | null;
  bracket_position?: number | null;
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
  source: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type TournamentBracketLinkRow = {
  id: string;
  submission_id: string;
  stage_id: string;
  source_match_id: string;
  outcome: string;
  target_match_id: string;
  target_slot: string;
  created_at: string;
  updated_at: string;
};

type TournamentStandingsConfigRow = {
  id: string;
  stage_id: string;
  submission_id: string;
  enabled: boolean;
  points_for_win: number;
  points_for_loss: number;
  points_for_walkover: number;
  score_difference_enabled: boolean;
  qualification_places: number | null;
  calculation_mode: string;
  created_at: string;
  updated_at: string;
};

type TournamentStageGroupTeamRow = {
  id: string;
  submission_id: string;
  stage_id: string;
  team_id: string;
  group_name: string;
  sequence_number: number;
  created_at: string;
  updated_at: string;
};

type TournamentStandingAdjustmentRow = {
  id: string;
  submission_id: string;
  stage_id: string;
  team_id: string;
  points_adjustment: number;
  rank_override: number | null;
  qualified_override: boolean | null;
  public_note: string | null;
  created_at: string;
  updated_at: string;
};

type TournamentImportSessionRow = {
  id: string;
  submission_id: string;
  source_type: string;
  source_filename: string;
  source_url_safe: string | null;
  source_fingerprint: string;
  template_type: string;
  status: string;
  detected_sheets: Json;
  mapping_config: Json;
  validation_summary: Json;
  import_summary: Json;
  fallback_timezone: string;
  timezone_confirmation_required: boolean;
  timezone_confirmed_at: string | null;
  created_by_actor_type: string;
  created_by_actor_id: string | null;
  created_by_workspace_token_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  applied_at: string | null;
};

type TournamentImportRow = {
  id: string;
  session_id: string;
  entity_type: string;
  source_sheet: string;
  source_row_number: number;
  source_key: string;
  source_references: Json;
  normalized_payload: Json;
  validation_status: string;
  validation_errors: Json;
  warnings: Json;
  proposed_action: string;
  existing_entity_id: string | null;
  resolution: Json | null;
  resolution_status: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      organizers: {
        Row: OrganizerRow;
        Insert: Omit<OrganizerRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizerRow, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      tournament_submissions: {
        Row: TournamentSubmissionRow;
        Insert: Pick<
          TournamentSubmissionRow,
          | "organizer_id"
          | "tournament_name"
          | "region"
          | "start_date"
          | "end_date"
          | "timezone"
        > &
          Partial<
            Omit<
              TournamentSubmissionRow,
              | "id"
              | "organizer_id"
              | "tournament_name"
              | "region"
              | "start_date"
              | "end_date"
              | "timezone"
            >
          > & {
            id?: string;
          };
        Update: Partial<
          Omit<TournamentSubmissionRow, "id" | "created_at" | "updated_at">
        >;
        Relationships: [
          {
            foreignKeyName: "tournament_submissions_organizer_id_fkey";
            columns: ["organizer_id"];
            isOneToOne: false;
            referencedRelation: "organizers";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_events: {
        Row: SubmissionEventRow;
        Insert: Omit<SubmissionEventRow, "id" | "created_at" | "metadata"> & {
          id?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Omit<SubmissionEventRow, "id" | "created_at">>;
        Relationships: [];
      };
      admin_users: {
        Row: AdminUserRow;
        Insert: Omit<AdminUserRow, "created_at"> & { created_at?: string };
        Update: Partial<Omit<AdminUserRow, "user_id" | "created_at">>;
        Relationships: [];
      };
      submission_edit_tokens: {
        Row: SubmissionEditTokenRow;
        Insert: Omit<
          SubmissionEditTokenRow,
          "id" | "created_at" | "used_at" | "revoked_at"
        > & {
          id?: string;
          created_at?: string;
          used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: Partial<Omit<SubmissionEditTokenRow, "id" | "created_at">>;
        Relationships: [];
      };
      organizer_workspace_tokens: {
        Row: OrganizerWorkspaceTokenRow;
        Insert: Omit<
          OrganizerWorkspaceTokenRow,
          "id" | "created_at" | "revoked_at" | "last_used_at"
        > & {
          id?: string;
          created_at?: string;
          revoked_at?: string | null;
          last_used_at?: string | null;
        };
        Update: Partial<Omit<OrganizerWorkspaceTokenRow, "id" | "created_at">>;
        Relationships: [];
      };
      published_tournaments: {
        Row: PublishedTournamentRow;
        Insert: Omit<
          PublishedTournamentRow,
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PublishedTournamentRow, "id" | "created_at">>;
        Relationships: [];
      };
      tournament_stages: {
        Row: TournamentStageRow;
        Insert: Pick<
          TournamentStageRow,
          "submission_id" | "name" | "slug" | "stage_type" | "sequence_number"
        > &
          Partial<
            Omit<
              TournamentStageRow,
              | "id"
              | "submission_id"
              | "name"
              | "slug"
              | "stage_type"
              | "sequence_number"
            >
          >;
        Update: Partial<
          Omit<TournamentStageRow, "id" | "submission_id" | "created_at">
        >;
        Relationships: [
          {
            foreignKeyName: "tournament_stages_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "tournament_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_teams: {
        Row: TournamentTeamRow;
        Insert: Pick<TournamentTeamRow, "submission_id" | "name" | "slug"> &
          Partial<
            Omit<TournamentTeamRow, "id" | "submission_id" | "name" | "slug">
          >;
        Update: Partial<
          Omit<TournamentTeamRow, "id" | "submission_id" | "created_at">
        >;
        Relationships: [
          {
            foreignKeyName: "tournament_teams_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "tournament_submissions";
            referencedColumns: ["id"];
          },
        ];
      };
      players: {
        Row: PlayerRow;
        Insert: Pick<PlayerRow, "display_name" | "normalized_name"> &
          Partial<Omit<PlayerRow, "id" | "display_name" | "normalized_name">>;
        Update: Partial<Omit<PlayerRow, "id" | "created_at">>;
        Relationships: [];
      };
      tournament_roster_members: {
        Row: TournamentRosterMemberRow;
        Insert: Pick<
          TournamentRosterMemberRow,
          "tournament_team_id" | "player_id"
        > &
          Partial<
            Omit<
              TournamentRosterMemberRow,
              "id" | "tournament_team_id" | "player_id"
            >
          >;
        Update: Partial<
          Omit<
            TournamentRosterMemberRow,
            "id" | "tournament_team_id" | "player_id" | "created_at"
          >
        >;
        Relationships: [
          {
            foreignKeyName: "tournament_roster_members_tournament_team_id_fkey";
            columns: ["tournament_team_id"];
            isOneToOne: false;
            referencedRelation: "tournament_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_roster_members_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_matches: {
        Row: TournamentMatchRow;
        Insert: Pick<TournamentMatchRow, "submission_id"> &
          Partial<Omit<TournamentMatchRow, "id" | "submission_id">>;
        Update: Partial<
          Omit<TournamentMatchRow, "id" | "submission_id" | "created_at">
        >;
        Relationships: [
          {
            foreignKeyName: "tournament_matches_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "tournament_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_matches_stage_id_fkey";
            columns: ["stage_id"];
            isOneToOne: false;
            referencedRelation: "tournament_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_matches_team_a_id_fkey";
            columns: ["team_a_id"];
            isOneToOne: false;
            referencedRelation: "tournament_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_matches_team_b_id_fkey";
            columns: ["team_b_id"];
            isOneToOne: false;
            referencedRelation: "tournament_teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey";
            columns: ["winner_team_id"];
            isOneToOne: false;
            referencedRelation: "tournament_teams";
            referencedColumns: ["id"];
          },
        ];
      };
      tournament_bracket_links: {
        Row: TournamentBracketLinkRow;
        Insert: Omit<
          TournamentBracketLinkRow,
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<TournamentBracketLinkRow, "id" | "created_at" | "updated_at">
          >;
        Update: Partial<
          Omit<TournamentBracketLinkRow, "id" | "submission_id" | "created_at">
        >;
        Relationships: [];
      };
      tournament_stage_standings_config: {
        Row: TournamentStandingsConfigRow;
        Insert: Pick<
          TournamentStandingsConfigRow,
          "stage_id" | "submission_id"
        > &
          Partial<
            Omit<
              TournamentStandingsConfigRow,
              "id" | "stage_id" | "submission_id"
            >
          >;
        Update: Partial<
          Omit<
            TournamentStandingsConfigRow,
            "id" | "stage_id" | "submission_id" | "created_at"
          >
        >;
        Relationships: [];
      };
      tournament_stage_group_teams: {
        Row: TournamentStageGroupTeamRow;
        Insert: Omit<
          TournamentStageGroupTeamRow,
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              TournamentStageGroupTeamRow,
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Omit<
            TournamentStageGroupTeamRow,
            "id" | "submission_id" | "created_at"
          >
        >;
        Relationships: [];
      };
      tournament_standing_adjustments: {
        Row: TournamentStandingAdjustmentRow;
        Insert: Omit<
          TournamentStandingAdjustmentRow,
          "id" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              TournamentStandingAdjustmentRow,
              "id" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<
          Omit<
            TournamentStandingAdjustmentRow,
            "id" | "submission_id" | "created_at"
          >
        >;
        Relationships: [];
      };
      tournament_import_sessions: {
        Row: TournamentImportSessionRow;
        Insert: Pick<
          TournamentImportSessionRow,
          | "submission_id"
          | "source_type"
          | "source_filename"
          | "source_fingerprint"
          | "template_type"
          | "created_by_actor_type"
        > &
          Partial<
            Omit<
              TournamentImportSessionRow,
              | "submission_id"
              | "source_type"
              | "source_filename"
              | "source_fingerprint"
              | "template_type"
              | "created_by_actor_type"
            >
          >;
        Update: Partial<
          Omit<
            TournamentImportSessionRow,
            "id" | "submission_id" | "created_at"
          >
        >;
        Relationships: [];
      };
      tournament_import_rows: {
        Row: TournamentImportRow;
        Insert: Pick<
          TournamentImportRow,
          | "session_id"
          | "entity_type"
          | "source_sheet"
          | "source_row_number"
          | "source_key"
          | "normalized_payload"
          | "validation_status"
          | "proposed_action"
        > &
          Partial<
            Omit<
              TournamentImportRow,
              | "session_id"
              | "entity_type"
              | "source_sheet"
              | "source_row_number"
              | "source_key"
              | "normalized_payload"
              | "validation_status"
              | "proposed_action"
            >
          >;
        Update: Partial<
          Omit<TournamentImportRow, "id" | "session_id" | "created_at">
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      expire_tournament_import_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      confirm_tournament_import_timezone: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_timezone: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      resolve_tournament_import_conflict: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_row_id: string;
          p_decision: string;
          p_existing_entity_id: string | null;
          p_confirmed_completed_result_overwrite: boolean;
          p_expected_session_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      recompute_tournament_import_readiness: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      apply_tournament_import_session: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      cancel_tournament_import_session: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      mark_tournament_import_failed: {
        Args: {
          p_session_id: string;
          p_submission_id: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
          p_error_code: string;
        };
        Returns: undefined;
      };
      create_tournament_submission_with_organizer: {
        Args: {
          p_organizer: Json;
          p_submission: Json;
        };
        Returns: Json;
      };
      moderate_tournament_submission: {
        Args: {
          p_submission_id: string;
          p_expected_status: string;
          p_target_status: string;
          p_reviewer_id: string;
          p_reviewer_note: string | null;
        };
        Returns: Json;
      };
      create_submission_edit_token: {
        Args: {
          p_submission_id: string;
          p_token_hash: string;
          p_expires_at: string;
          p_created_by: string;
        };
        Returns: Json;
      };
      revoke_submission_edit_tokens: {
        Args: { p_submission_id: string; p_reviewer_id: string };
        Returns: Json;
      };
      create_organizer_workspace_token: {
        Args: {
          p_submission_id: string;
          p_token_hash: string;
          p_label: string | null;
          p_expires_at: string;
          p_created_by: string;
        };
        Returns: Json;
      };
      revoke_organizer_workspace_token: {
        Args: { p_submission_id: string; p_reviewer_id: string };
        Returns: Json;
      };
      validate_organizer_workspace_access: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      create_tournament_stage: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_tournament_stage: {
        Args: {
          p_submission_id: string;
          p_stage_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      delete_tournament_stage: {
        Args: {
          p_submission_id: string;
          p_stage_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      create_tournament_team: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_tournament_team: {
        Args: {
          p_submission_id: string;
          p_team_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      delete_tournament_team: {
        Args: {
          p_submission_id: string;
          p_team_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      create_tournament_match: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_tournament_match: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_tournament_match_status: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      complete_tournament_match: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      cancel_tournament_match: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      reopen_tournament_match: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      delete_tournament_match: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      assign_match_bracket_position: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_expected_updated_at: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      create_tournament_bracket_link: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      delete_tournament_bracket_link: {
        Args: {
          p_submission_id: string;
          p_link_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      advance_tournament_bracket_outcome: {
        Args: {
          p_submission_id: string;
          p_match_id: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_stage_standings_config: {
        Args: {
          p_submission_id: string;
          p_stage_id: string;
          p_expected_updated_at: string | null;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      assign_team_to_stage_group: {
        Args: {
          p_submission_id: string;
          p_stage_id: string;
          p_team_id: string;
          p_group_name: string;
          p_sequence_number: number;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      remove_team_from_stage_group: {
        Args: {
          p_submission_id: string;
          p_assignment_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      upsert_standing_adjustment: {
        Args: {
          p_submission_id: string;
          p_stage_id: string;
          p_team_id: string;
          p_expected_updated_at: string | null;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      delete_standing_adjustment: {
        Args: {
          p_submission_id: string;
          p_adjustment_id: string;
          p_expected_updated_at: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      get_tournament_stage_standings: {
        Args: { p_submission_id: string; p_stage_id: string };
        Returns: Json;
      };
      search_players_for_roster: {
        Args: {
          p_submission_id: string;
          p_query: string;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      create_player_and_add_to_roster: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      add_existing_player_to_roster: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_player_profile: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      update_roster_membership: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      remove_roster_member: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      restore_roster_member: {
        Args: {
          p_submission_id: string;
          p_payload: Json;
          p_actor_type: string;
          p_actor_id: string | null;
          p_workspace_token_id: string | null;
        };
        Returns: Json;
      };
      resubmit_tournament_submission: {
        Args: { p_token_hash: string; p_submission: Json };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
