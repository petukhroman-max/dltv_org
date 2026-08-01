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
    };
    Views: Record<string, never>;
    Functions: {
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
