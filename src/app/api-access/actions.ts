"use server";

import "server-only";

import { apiAccessRequestSchema } from "@/lib/public-api/access-request.schema";
import type { ApiAccessRequestActionState } from "@/lib/public-api/access-request.state";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function string(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function submitApiAccessRequestAction(
  _previous: ApiAccessRequestActionState,
  formData: FormData,
): Promise<ApiAccessRequestActionState> {
  if (string(formData, "company_fax")) return { status: "error" };
  const renderedAt = Number(string(formData, "rendered_at"));
  if (!Number.isFinite(renderedAt) || Date.now() - renderedAt < 800) {
    return { status: "error" };
  }
  const parsed = apiAccessRequestSchema.safeParse({
    organization_name: string(formData, "organization_name"),
    contact_name: string(formData, "contact_name"),
    contact_email: string(formData, "contact_email"),
    website_url: string(formData, "website_url"),
    intended_use: string(formData, "intended_use"),
    expected_request_volume: string(formData, "expected_request_volume"),
    requested_endpoints: formData
      .getAll("requested_endpoints")
      .filter((value): value is string => typeof value === "string"),
    attribution_accepted: formData.get("attribution_accepted") === "on",
    terms_accepted: formData.get("terms_accepted") === "on",
  });
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(
          ([key, messages]) => [key, messages?.[0]],
        ),
      ),
    };
  }
  try {
    const { error } = await createSupabaseAdminClient().rpc(
      "submit_api_access_request",
      {
        p_organization_name: parsed.data.organization_name,
        p_contact_name: parsed.data.contact_name,
        p_contact_email: parsed.data.contact_email,
        p_website_url: parsed.data.website_url,
        p_intended_use: parsed.data.intended_use,
        p_expected_request_volume: parsed.data.expected_request_volume,
        p_requested_endpoints: parsed.data.requested_endpoints,
        p_attribution_accepted: true,
        p_terms_accepted: true,
      },
    );
    return error ? { status: "error" } : { status: "success" };
  } catch {
    return { status: "error" };
  }
}
