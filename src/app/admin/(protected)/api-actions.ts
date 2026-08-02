"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/require-admin";
import { apiEndpointNames } from "@/lib/public-api/constants";
import {
  generateApiKey,
  hashApiKey,
  requireApiKeyPepper,
} from "@/lib/public-api/key-security";
import type { ApiKeyActionState } from "@/lib/public-api/admin-action.state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const safeOrigin = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  })
  .transform((value) => new URL(value).origin);

function strings(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is string => typeof value === "string");
}

export async function approveApiAccessRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      requestId: uuid,
      clientSlug: slug,
      minute: z.coerce.number().int().min(1).max(10000),
      day: z.coerce.number().int().min(1).max(10000000),
      note: z.string().max(4000),
    })
    .safeParse({
      requestId: formData.get("request_id"),
      clientSlug: formData.get("client_slug"),
      minute: formData.get("rate_limit_per_minute"),
      day: formData.get("rate_limit_per_day"),
      note: formData.get("admin_note") ?? "",
    });
  if (!parsed.success) return;
  const endpoints = strings(formData, "allowed_endpoints").filter((value) =>
    apiEndpointNames.includes(value as (typeof apiEndpointNames)[number]),
  );
  const origins = strings(formData, "allowed_origins")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => safeOrigin.parse(value));
  const { error } = await createSupabaseAdminClient().rpc(
    "approve_api_access_request",
    {
      p_request_id: parsed.data.requestId,
      p_reviewer_id: admin.userId,
      p_client_slug: parsed.data.clientSlug,
      p_rate_limit_per_minute: parsed.data.minute,
      p_rate_limit_per_day: parsed.data.day,
      p_allowed_endpoints: endpoints,
      p_allowed_origins: origins,
      p_admin_note: parsed.data.note,
    },
  );
  if (error) throw new Error("API access approval failed");
  revalidatePath("/admin/api-access");
  revalidatePath("/admin/api-clients");
}

export async function rejectApiAccessRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = uuid.parse(formData.get("request_id"));
  const note = z
    .string()
    .trim()
    .min(1)
    .max(4000)
    .parse(formData.get("admin_note"));
  const { error } = await createSupabaseAdminClient().rpc(
    "reject_api_access_request",
    {
      p_request_id: requestId,
      p_reviewer_id: admin.userId,
      p_admin_note: note,
    },
  );
  if (error) throw new Error("API access rejection failed");
  revalidatePath("/admin/api-access");
}

export async function createApiKeyAction(
  _previous: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      clientId: uuid,
      label: z.string().trim().max(120),
      expiresAt: z.string().trim().max(40),
    })
    .safeParse({
      clientId: formData.get("client_id"),
      label: formData.get("label") ?? "",
      expiresAt: formData.get("expires_at") ?? "",
    });
  if (!parsed.success)
    return { status: "error", message: "Invalid key settings." };
  const { rawKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(rawKey, requireApiKeyPepper());
  const { error } = await createSupabaseAdminClient().rpc("create_api_key", {
    p_client_id: parsed.data.clientId,
    p_key_prefix: prefix,
    p_key_hash: keyHash,
    p_label: parsed.data.label,
    p_expires_at: parsed.data.expiresAt || null,
    p_actor_id: admin.userId,
  });
  if (error)
    return { status: "error", message: "The key could not be created." };
  revalidatePath(`/admin/api-clients/${parsed.data.clientId}`);
  return {
    status: "success",
    rawKey,
    keyPrefix: prefix,
    createdAt: new Date().toISOString(),
  };
}

export async function rotateApiKeyAction(
  _previous: ApiKeyActionState,
  formData: FormData,
): Promise<ApiKeyActionState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      clientId: uuid,
      oldKeyId: uuid,
      label: z.string().trim().max(120),
      expiresAt: z.string().trim().max(40),
    })
    .safeParse({
      clientId: formData.get("client_id"),
      oldKeyId: formData.get("old_key_id"),
      label: formData.get("label") ?? "",
      expiresAt: formData.get("expires_at") ?? "",
    });
  if (!parsed.success)
    return { status: "error", message: "Invalid key settings." };
  const { rawKey, prefix } = generateApiKey();
  const { error } = await createSupabaseAdminClient().rpc("rotate_api_key", {
    p_client_id: parsed.data.clientId,
    p_old_key_id: parsed.data.oldKeyId,
    p_key_prefix: prefix,
    p_key_hash: hashApiKey(rawKey, requireApiKeyPepper()),
    p_label: parsed.data.label,
    p_expires_at: parsed.data.expiresAt || null,
    p_actor_id: admin.userId,
  });
  if (error)
    return { status: "error", message: "The key could not be rotated." };
  revalidatePath(`/admin/api-clients/${parsed.data.clientId}`);
  return {
    status: "success",
    rawKey,
    keyPrefix: prefix,
    createdAt: new Date().toISOString(),
  };
}

export async function updateApiKeyStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      clientId: uuid,
      keyId: uuid,
      status: z.enum(["suspended", "revoked"]),
    })
    .parse({
      clientId: formData.get("client_id"),
      keyId: formData.get("key_id"),
      status: formData.get("status"),
    });
  const { error } = await createSupabaseAdminClient().rpc(
    "update_api_key_status",
    {
      p_client_id: parsed.clientId,
      p_key_id: parsed.keyId,
      p_status: parsed.status,
      p_actor_id: admin.userId,
    },
  );
  if (error) throw new Error("API key status update failed");
  revalidatePath(`/admin/api-clients/${parsed.clientId}`);
}

export async function updateApiClientAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      clientId: uuid,
      status: z.enum(["active", "suspended", "revoked"]),
      attributionStatus: z.enum([
        "not_reviewed",
        "compliant",
        "non_compliant",
        "grace_period",
      ]),
      minute: z.coerce.number().int().min(1).max(10000),
      day: z.coerce.number().int().min(1).max(10000000),
      note: z.string().max(4000),
    })
    .parse({
      clientId: formData.get("client_id"),
      status: formData.get("status"),
      attributionStatus: formData.get("attribution_status"),
      minute: formData.get("rate_limit_per_minute"),
      day: formData.get("rate_limit_per_day"),
      note: formData.get("attribution_note") ?? "",
    });
  const endpoints = strings(formData, "allowed_endpoints").filter((value) =>
    apiEndpointNames.includes(value as (typeof apiEndpointNames)[number]),
  );
  const origins = strings(formData, "allowed_origins")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => safeOrigin.parse(value));
  const { error } = await createSupabaseAdminClient().rpc(
    "update_api_client_settings",
    {
      p_client_id: parsed.clientId,
      p_status: parsed.status,
      p_attribution_status: parsed.attributionStatus,
      p_attribution_note: parsed.note,
      p_limit_per_minute: parsed.minute,
      p_limit_per_day: parsed.day,
      p_allowed_endpoints: endpoints,
      p_allowed_origins: origins,
      p_actor_id: admin.userId,
    },
  );
  if (error) throw new Error("API client update failed");
  revalidatePath(`/admin/api-clients/${parsed.clientId}`);
}
