import { z } from "zod";

import { apiEndpointNames } from "@/lib/public-api/constants";

const httpUrl = z
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
  });

export const apiAccessRequestSchema = z.object({
  organization_name: z.string().trim().min(2).max(160),
  contact_name: z.string().trim().min(2).max(120),
  contact_email: z.string().trim().toLowerCase().email().max(254),
  website_url: httpUrl,
  intended_use: z.string().trim().min(20).max(4000),
  expected_request_volume: z.string().trim().max(500).default(""),
  requested_endpoints: z.array(z.enum(apiEndpointNames)).max(7),
  attribution_accepted: z.literal(true),
  terms_accepted: z.literal(true),
});

export type ApiAccessRequestInput = z.infer<typeof apiAccessRequestSchema>;
