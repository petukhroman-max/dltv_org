import type { TableRow } from "@/lib/supabase/database.types";

export const submissionId = "08bd117e-7188-49a4-a49b-5122c0a3ea57";
export const organizerId = "7089d406-c3e7-4a40-a236-86d9fd45081d";

export function makeSubmission(
  overrides: Partial<TableRow<"tournament_submissions">> = {},
): TableRow<"tournament_submissions"> {
  return {
    id: submissionId,
    organizer_id: organizerId,
    status: "submitted",
    tournament_name: "Summer Cup",
    description: "Community tournament",
    region: "EU",
    language: "English",
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    timezone: "Europe/Berlin",
    format: "Swiss",
    prize_pool_text: "$5,000",
    registration_url: "https://example.com/register",
    bracket_url: "https://example.com/bracket",
    discord_url: "https://discord.gg/example",
    stream_url: "https://example.com/stream",
    rules_url: "https://example.com/rules",
    is_online: true,
    max_teams: 16,
    registration_deadline: "2026-08-05T16:00:00Z",
    organizer_notes: "Organizer note",
    reviewer_notes: null,
    submitted_at: "2026-07-31T10:00:00Z",
    reviewed_at: null,
    published_at: null,
    reviewed_by: null,
    created_at: "2026-07-31T09:00:00Z",
    updated_at: "2026-07-31T10:00:00Z",
    ...overrides,
  };
}

export function makeOrganizer(
  overrides: Partial<TableRow<"organizers">> = {},
): TableRow<"organizers"> {
  return {
    id: organizerId,
    organization_name: "DLTV Events",
    contact_name: "Tournament Team",
    contact_email: "events@example.com",
    discord_username: "dltv_events",
    website_url: "https://example.com",
    created_at: "2026-07-31T09:00:00Z",
    updated_at: "2026-07-31T09:00:00Z",
    ...overrides,
  };
}

export function makeEvent(
  overrides: Partial<TableRow<"submission_events">> = {},
): TableRow<"submission_events"> {
  return {
    id: "92af62d3-ddec-4821-a557-504b0113e639",
    submission_id: submissionId,
    event_type: "submitted",
    from_status: "draft",
    to_status: "submitted",
    actor_type: "organizer",
    actor_id: null,
    metadata: { consent_to_publish: true, consent_version: "v1" },
    created_at: "2026-07-31T10:00:00Z",
    ...overrides,
  };
}
