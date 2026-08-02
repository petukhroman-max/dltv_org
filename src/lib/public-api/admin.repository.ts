import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function listApiAccessRequests() {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_access_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("API access requests query failed");
  return data ?? [];
}

export async function getApiAccessRequest(id: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_access_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("API access request query failed");
  return data;
}

export async function listApiClients() {
  const { data, error } = await createSupabaseAdminClient()
    .from("api_clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("API clients query failed");
  return data ?? [];
}

export async function getApiClientDetails(id: string) {
  const client = createSupabaseAdminClient();
  const [{ data, error }, keys, usage, errors, audit] = await Promise.all([
    client.from("api_clients").select("*").eq("id", id).maybeSingle(),
    client
      .from("api_keys")
      .select(
        "id, key_prefix, label, status, last_used_at, expires_at, revoked_at, created_at",
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("api_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id),
    client
      .from("api_usage_logs")
      .select("request_id, endpoint, response_status, created_at")
      .eq("client_id", id)
      .gte("response_status", 400)
      .order("created_at", { ascending: false })
      .limit(20),
    client
      .from("api_audit_events")
      .select("event_type, metadata, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (error || keys.error || usage.error || errors.error || audit.error)
    throw new Error("API client details query failed");
  return data
    ? {
        client: data,
        keys: keys.data ?? [],
        usageCount: usage.count ?? 0,
        recentErrors: errors.data ?? [],
        audit: audit.data ?? [],
      }
    : null;
}
