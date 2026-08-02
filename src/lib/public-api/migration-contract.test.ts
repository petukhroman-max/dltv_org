import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs
  .readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20260803000000_add_authenticated_public_api_v1.sql",
    ),
    "utf8",
  )
  .toLowerCase();

describe("Public API v1 migration contract", () => {
  it.each([
    "api_access_requests",
    "api_clients",
    "api_keys",
    "api_usage_logs",
    "api_rate_limit_buckets",
    "api_audit_events",
  ])("keeps %s private by default", (table) => {
    expect(migration).toContain(
      `alter table public.${table} enable row level security`,
    );
  });

  it("exposes only the narrow application RPC and service-role administration", () => {
    expect(migration).toContain(
      "grant execute on function public.submit_api_access_request",
    );
    expect(migration).toContain("to anon, authenticated, service_role");
    expect(migration).toContain(
      "grant execute on function public.approve_api_access_request",
    );
    expect(migration).toContain("to service_role");
    expect(migration).toContain(
      "revoke all on table public.api_access_requests",
    );
  });

  it("stores only HMAC hashes and makes revocation/public identifiers irreversible", () => {
    expect(migration).toContain("key_hash text not null unique");
    expect(migration).not.toContain("raw_key");
    expect(migration).toContain("prevent_api_revocation_reversal");
    expect(migration).toContain("tournament_matches_public_id_immutable");
    expect(migration).toContain("published_tournaments_slug_immutable");
    expect(migration).toContain(
      "tournament_stages_slug_immutable_after_publication",
    );
    expect(migration).toContain(
      "tournament_teams_slug_immutable_after_publication",
    );
    expect(migration).toContain(
      "create extension if not exists pgcrypto with schema extensions",
    );
    expect(migration).toContain("extensions.gen_random_bytes(16)");
    expect(migration).not.toMatch(/(?<!\.)\bgen_random_bytes\s*\(/);
    expect(migration).not.toMatch(/(?<!\.)\bgen_random_uuid\s*\(/);
  });

  it("backfills only missing public IDs and retries theoretical collisions before uniqueness", () => {
    const backfill = migration.indexOf("do $$");
    const uniqueConstraint = migration.indexOf(
      "constraint tournament_matches_public_id_key unique",
    );
    expect(backfill).toBeGreaterThan(-1);
    expect(migration).toContain("where public_id is null");
    expect(migration).toContain("where public_id = v_public_id");
    expect(migration).toContain("where id = v_match_id");
    expect(uniqueConstraint).toBeGreaterThan(backfill);
  });

  it("uses atomic rate-limit buckets and safe usage fields", () => {
    expect(migration).toContain(
      "on conflict (scope_type, scope_id, bucket_kind, bucket_start)",
    );
    expect(migration).toContain("values (p_client_id, null, 'client'");
    expect(migration).toContain("values (p_client_id, p_api_key_id, 'key'");
    expect(migration).not.toContain("authorization_header");
    expect(migration).not.toContain("query_string");
    expect(migration).not.toContain("ip_address");
  });

  it("makes administration transitions atomic and duplicate approval idempotent", () => {
    expect(migration).toContain("if v_request.status = 'approved' then");
    expect(migration).toContain("'idempotent', true");
    for (const rpc of [
      "approve_api_access_request",
      "reject_api_access_request",
      "create_api_key",
      "update_api_key_status",
      "update_api_client_settings",
      "rotate_api_key",
    ]) {
      expect(migration).toContain(`create or replace function public.${rpc}`);
      expect(migration).toContain(`grant execute on function public.${rpc}`);
    }
    expect(migration).toContain(
      "update public.api_keys set status = 'revoked'",
    );
    expect(migration).toContain("'api_client_settings_updated'");
  });
});
