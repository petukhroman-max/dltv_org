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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TableRow<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
