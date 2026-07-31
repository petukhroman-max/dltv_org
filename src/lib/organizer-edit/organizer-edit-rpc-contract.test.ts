import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260731193000_add_submission_edit_resubmission.sql",
  ),
  "utf8",
).toLowerCase();

describe("organizer edit migration contract", () => {
  it("stores only token hashes and protects the table", () => {
    expect(sql).toContain("token_hash text not null unique");
    expect(sql).not.toMatch(/\braw_token\b|\bplaintext_token\b/);
    expect(sql).toContain(
      "alter table public.submission_edit_tokens enable row level security",
    );
    expect(sql).toContain(
      "revoke all on table public.submission_edit_tokens from public, anon, authenticated",
    );
  });

  it("pins search paths and exposes RPCs only to service_role", () => {
    expect(sql.match(/security definer/g)).toHaveLength(3);
    expect(sql.match(/set search_path = pg_catalog, public/g)).toHaveLength(3);
    expect(sql.match(/to service_role;/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sql).toContain(
      "revoke all on function public.resubmit_tournament_submission(text, jsonb)",
    );
  });

  it("atomically consumes the token and writes a fixed organizer audit event", () => {
    expect(sql).toContain("for update;");
    expect(sql).toContain("set used_at = now()");
    expect(sql).toContain(
      "'submission_resubmitted', 'needs_changes', 'submitted'",
    );
    expect(sql).toContain("'organizer', null");
  });

  it("updates an explicit editable-field allowlist and preserves reviewer notes", () => {
    expect(sql).toContain("p_submission - array[");
    for (const field of [
      "tournament_name",
      "description",
      "region",
      "language",
      "start_date",
      "end_date",
      "timezone",
      "format",
      "prize_pool_text",
      "registration_url",
      "bracket_url",
      "discord_url",
      "stream_url",
      "rules_url",
      "is_online",
      "max_teams",
      "registration_deadline",
      "organizer_notes",
    ])
      expect(sql).toContain(`${field} =`);
    expect(sql).not.toContain("reviewer_notes =");
    expect(sql).toContain("reviewed_at = null");
    expect(sql).toContain("reviewed_by = null");
  });
});
