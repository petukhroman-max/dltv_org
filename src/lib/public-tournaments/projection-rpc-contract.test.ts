import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260731203000_add_public_tournament_catalog.sql",
  ),
  "utf8",
)
  .replace(/\r\n/g, "\n")
  .toLowerCase();

describe("public tournament projection migration", () => {
  it("creates a public-safe read model with read-only RLS", () => {
    expect(sql).toContain("create table public.published_tournaments");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain(
      "grant select on table public.published_tournaments to anon, authenticated",
    );
    expect(sql).toContain("using (visibility_status = 'published')");
    expect(sql).not.toMatch(
      /\n  (?:contact_email|contact_name|reviewer_notes|organizer_notes|token_hash)\s/,
    );
  });

  it("projects publish atomically and preserves id and slug on republish", () => {
    expect(sql).toContain("if p_target_status = 'published' then");
    expect(sql).toContain("where submission_id = v_updated.id\n    for update");
    expect(sql).toContain("update public.published_tournaments");
    expect(sql).not.toMatch(/set\s+slug\s*=/);
    expect(sql).toContain("insert into public.published_tournaments");
    expect(sql).toContain("'public_tournament_id'");
  });

  it("hides published projections when changes are requested", () => {
    expect(sql).toContain(
      "v_current_status = 'published' and p_target_status = 'needs_changes'",
    );
    expect(sql).toContain("set visibility_status = 'hidden'");
    expect(sql).not.toContain("delete from public.published_tournaments");
  });

  it("keeps the moderation RPC service-role-only and transactional", () => {
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql).toContain(
      "revoke all on function public.moderate_tournament_submission",
    );
    expect(sql).toContain("to service_role;");
  });
});
