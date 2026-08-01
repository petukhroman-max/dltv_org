import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const migrationFilename = "20260731174500_add_submission_moderation_rpc.sql";
const migration = readFileSync(
  join(migrationsDirectory, migrationFilename),
  "utf8",
).replace(/\r\n/g, "\n");

describe("moderation RPC migration contract", () => {
  it("uses a unique 14-digit migration timestamp", () => {
    const timestamps = readdirSync(migrationsDirectory).map((filename) =>
      filename.slice(0, 14),
    );

    expect(migrationFilename).toMatch(/^\d{14}_[a-z0-9_]+\.sql$/);
    expect(
      timestamps.filter((value) => value === "20260731174500"),
    ).toHaveLength(1);
  });

  it("defines the typed atomic RPC and optimistic status update", () => {
    expect(migration).toContain(
      "public.moderate_tournament_submission(\n  p_submission_id uuid,",
    );
    expect(migration).toContain("and status = p_expected_status");
    expect(migration).toContain("insert into public.submission_events");
    expect(migration).toContain("'moderation_source', 'admin_portal'");
  });

  it("locks execution to service_role with a fixed search path", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = pg_catalog, public");
    expect(migration).toContain(") from public, anon, authenticated;");
    expect(migration).toContain(") to service_role;");
    expect(migration).not.toMatch(/execute\s+format|\bexec\s*\(/i);
  });
});
